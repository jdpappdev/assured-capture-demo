import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { generateId } from '../db/storage';
import { Report, Issue, Photo, TextBoxAnnotation } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { VoiceTranscriptionControl } from './VoiceTranscriptionControl';
import { AssuredSelect } from './AssuredSelect';
import {
  ArrowLeft,
  Save,
  Trash2,
  Check,
  AlertCircle,
  PenTool,
  RotateCcw,
  CheckCheck,
  X,
  Camera,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Move,
  MoveHorizontal,
  MapPin,
  Plus,
  Minus,
  Type,
  Clock,
  Calendar,
} from 'lucide-react';
import { formatCaptureDateTime, extractExifCaptureDate } from '../utils/exifUtils';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const rawParagraphs = text.split(/\r?\n/);

  for (const paragraph of rawParagraphs) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        // If single word itself exceeds maxWidth, break the word into character chunks
        if (ctx.measureText(word).width > maxWidth) {
          let subWord = '';
          for (const char of word) {
            if (ctx.measureText(subWord + char).width > maxWidth) {
              if (subWord) lines.push(subWord);
              subWord = char;
            } else {
              subWord += char;
            }
          }
          currentLine = subWord;
        } else {
          currentLine = word;
        }
      } else if (metrics.width > maxWidth && !currentLine) {
        let subWord = '';
        for (const char of word) {
          if (ctx.measureText(subWord + char).width > maxWidth) {
            if (subWord) lines.push(subWord);
            subWord = char;
          } else {
            subWord += char;
          }
        }
        currentLine = subWord;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}


const CALLOUT_INK = '#152128';
const CALLOUT_TEXT = '#FFFFFF';
const CALLOUT_FONT = 'system-ui, sans-serif';
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

function calloutWidth(value: number, imageWidth: number) {
  return clamp(value, Math.min(108, imageWidth - 8), imageWidth - 8);
}

function layoutCallout(ctx: CanvasRenderingContext2D, box: TextBoxAnnotation, width: number, height: number) {
  const size = Math.round(13 * clamp(box.scale ?? 1, .65, 2.5));
  const lineHeight = Math.round(size * 1.3);
  const defaultWidth = Math.max(112, Math.min(190, width * .57));
  const labelWidth = calloutWidth(box.widthPercent === undefined ? defaultWidth : box.widthPercent * width / 100, width);
  const padding = 8;
  const badgeWidth = 28;
  ctx.font = `650 ${size}px ${CALLOUT_FONT}`;
  const lines = wrapText(ctx, box.text.trim() || 'Add note', Math.max(12, labelWidth - badgeWidth - padding * 2));
  const labelHeight = Math.max(44, lines.length * lineHeight + padding * 2);
  const left = clamp(box.x * width / 100, 4, width - labelWidth - 4);
  const top = clamp(box.y * height / 100, 4, height - labelHeight - 4);
  const anchor = box.anchor && { x: box.anchor.x * width / 100, y: box.anchor.y * height / 100 };
  const lineStart = anchor && {
    x: clamp(anchor.x, left, left + labelWidth),
    y: clamp(anchor.y, top, top + labelHeight),
  };
  return { size, lineHeight, labelWidth, labelHeight, padding, badgeWidth, lines, left, top, anchor, lineStart };
}

function drawTextBoxOnCanvas(
  ctx: CanvasRenderingContext2D,
  box: TextBoxAnnotation,
  index: number,
  canvasWidth: number,
  canvasHeight: number,
  displayedWidth: number,
) {
  if (!box.text.trim()) return;
  const ratio = canvasWidth / displayedWidth;
  ctx.save();
  ctx.scale(ratio, ratio);
  const layout = layoutCallout(ctx, box, displayedWidth, canvasHeight / ratio);
  const { left, top, lines, size, padding, badgeWidth, lineHeight, anchor, lineStart } = layout;
  ctx.lineCap = 'round';
  if (anchor && lineStart) {
    ctx.beginPath();
    ctx.moveTo(lineStart.x, lineStart.y);
    ctx.lineTo(anchor.x, anchor.y);
    ctx.strokeStyle = CALLOUT_INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = box.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = box.color;
    ctx.fill();
    ctx.strokeStyle = CALLOUT_INK;
    ctx.stroke();
  }
  ctx.fillStyle = box.color;
  ctx.beginPath();
  ctx.roundRect(left + 5, top + 6, 23, 20, 4);
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.font = `750 11px ${CALLOUT_FONT}`;
  ctx.fillStyle = CALLOUT_INK;
  ctx.textAlign = 'center';
  ctx.fillText(String(index + 1).padStart(2, '0'), left + 16.5, top + 16);
  ctx.textAlign = 'left';
  ctx.font = `650 ${size}px ${CALLOUT_FONT}`;
  ctx.fillStyle = CALLOUT_TEXT;
  ctx.strokeStyle = CALLOUT_INK;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2.6, size * .19);
  lines.forEach((line, index) => {
    const x = left + badgeWidth + padding;
    const y = top + padding + lineHeight * (index + .5);
    ctx.strokeText(line, x, y);
    ctx.fillText(line, x, y);
  });
  ctx.restore();
}

interface PhotoDetailScreenProps {
  report: Report;
  issue: Issue;
  photo: Photo;
  photos?: Photo[];
  issues?: Issue[];
  onBack: () => void;
  onSelectPhoto?: (photoId: string) => void;
  onSavePhoto: (updatedPhoto: Photo) => Promise<boolean>;
  onDeletePhoto: (photoId: string) => Promise<boolean>;
}

export const PhotoDetailScreen: React.FC<PhotoDetailScreenProps> = ({
  report,
  issue,
  photo,
  photos = [],
  issues = [],
  onBack,
  onSelectPhoto,
  onSavePhoto,
  onDeletePhoto,
}) => {
  const [description, setDescription] = useState(photo.description || '');
  const [internalNotes, setInternalNotes] = useState(photo.internalNotes || '');
  const [includeInReport, setIncludeInReport] = useState<boolean>(photo.includeInReport !== false);
  const [selectedIssueId, setSelectedIssueId] = useState(photo.issueId || issue.id);
  const [currentImageFile, setCurrentImageFile] = useState(photo.imageFile);

  // Drawing / Markup mode states
  const [isMarkupActive, setIsMarkupActive] = useState(false);
  const [markupColor, setMarkupColor] = useState('#EF4444'); // Signal red default for defects
  const [markupTool, setMarkupTool] = useState<'pen' | 'arrow' | 'rect' | 'text'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);

  // Text Box Annotation states
  const [baseImageFile, setBaseImageFile] = useState<string>(photo.markupImageFile || photo.originalImageFile || photo.imageFile);
  const [textBoxes, setTextBoxes] = useState<TextBoxAnnotation[]>(photo.textBoxAnnotations || []);
  const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [movingCallout, setMovingCallout] = useState(false);
  const [calloutStatus, setCalloutStatus] = useState('');
  const dragOrigin = useRef<{ id: string; x: number; y: number; left: number; top: number } | null>(null);
  const calloutNoteRef = useRef<HTMLTextAreaElement>(null);
  const dragMoved = useRef(false);
  const resizeOrigin = useRef<{ clientX: number; width: number } | null>(null);
  const calloutMeasure = useRef<CanvasRenderingContext2D | null>(null);
  const appliedCallouts = useRef(photo.textBoxAnnotations || []);
  const selectedCallout = textBoxes.find(box => box.id === selectedTextBoxId);
  if (!calloutMeasure.current) calloutMeasure.current = document.createElement('canvas').getContext('2d');

  useEffect(() => {
    const image = imageContainerRef.current;
    if (!isMarkupActive || !image) return;
    const measure = () => setImageSize({ width: image.clientWidth, height: image.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(image);
    return () => observer.disconnect();
  }, [isMarkupActive]);

  // Original capture timestamp state (EXIF DateTimeOriginal)
  const [capturedAt, setCapturedAt] = useState<string | null | undefined>(photo.capturedAt);

  // Technical details disclosure state (hidden by default on mobile)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Photo Description 250-character recommended limit tracking & overflow backdrop
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const descriptionBackdropRef = useRef<HTMLDivElement | null>(null);
  const [descriptionScrollbarOffset, setDescriptionScrollbarOffset] = useState<number>(0);

  const descChars = Array.from(description);
  const descCharCount = descChars.length;
  const isDescOverLimit = descCharCount > 250;
  const descOverflowCount = Math.max(0, descCharCount - 250);

  const descValidText = descChars.slice(0, 250).join('');
  const descOverflowText = descChars.slice(250).join('');

  const syncDescriptionScroll = useCallback(() => {
    if (descriptionTextareaRef.current && descriptionBackdropRef.current) {
      descriptionBackdropRef.current.scrollTop = descriptionTextareaRef.current.scrollTop;
      descriptionBackdropRef.current.scrollLeft = descriptionTextareaRef.current.scrollLeft;

      const sbWidth = descriptionTextareaRef.current.offsetWidth - descriptionTextareaRef.current.clientWidth - 2;
      const effectiveSb = Math.max(0, sbWidth);
      if (effectiveSb !== descriptionScrollbarOffset) {
        setDescriptionScrollbarOffset(effectiveSb);
      }
    }
  }, [descriptionScrollbarOffset]);

  // Mobile keyboard visibility & focus tracking
  const [isInputFocused, setIsInputFocused] = useState(false);
  const blurTimeoutRef = useRef<any>(null);

  const handleFieldFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setIsInputFocused(true);
    const target = e.currentTarget;
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  };

  const handleFieldBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsInputFocused(false);
    }, 250);
  };

  useEffect(() => {
    syncDescriptionScroll();
  }, [description, syncDescriptionScroll]);

  useEffect(() => {
    setDescription(photo.description || '');
    setInternalNotes(photo.internalNotes || '');
    setIncludeInReport(photo.includeInReport !== false);
    setSelectedIssueId(photo.issueId || issue.id);
    setCurrentImageFile(photo.imageFile);
    setBaseImageFile(photo.markupImageFile || photo.originalImageFile || photo.imageFile);
    appliedCallouts.current = photo.textBoxAnnotations || [];
    setTextBoxes(appliedCallouts.current);
    setSelectedTextBoxId(null);
    setMovingCallout(false);

    // Prefer stored capturedAt; if unset/undefined, attempt lazy extraction from image once
    if (photo.capturedAt !== undefined) {
      setCapturedAt(photo.capturedAt);
    } else {
      let active = true;
      extractExifCaptureDate(photo.originalImageFile || photo.imageFile)
        .then(extracted => {
          if (active) setCapturedAt(extracted);
        })
        .catch(() => {
          if (active) setCapturedAt(null);
        });
      return () => {
        active = false;
      };
    }
  }, [photo, issue]);

  // Color change updates selected text box color in addition to markupColor
  const handleColorChange = (newColor: string) => {
    setMarkupColor(newColor);
    if (selectedTextBoxId) {
      setTextBoxes(prev =>
        prev.map(b => (b.id === selectedTextBoxId ? { ...b, color: newColor } : b))
      );
    }
  };

  const moveCalloutTo = (box: TextBoxAnnotation, x: number, y: number) => {
    const ctx = calloutMeasure.current;
    if (!ctx || !imageSize.width || !imageSize.height) return;
    const layout = layoutCallout(ctx, box, imageSize.width, imageSize.height);
    const nextX = clamp(x, 4, imageSize.width - layout.labelWidth - 4);
    const nextY = clamp(y, 4, imageSize.height - layout.labelHeight - 4);
    setTextBoxes(prev => prev.map(item => item.id === box.id
      ? { ...item, x: nextX * 100 / imageSize.width, y: nextY * 100 / imageSize.height }
      : item));
  };

  const resizeCallout = (id: string, width: number) => {
    if (!imageSize.width) return;
    const widthPercent = calloutWidth(width, imageSize.width) * 100 / imageSize.width;
    setTextBoxes(prev => prev.map(box => box.id === id ? { ...box, widthPercent } : box));
  };

  const addCallout = (x: number, y: number) => {
    const id = generateId();
    // Commit the note input before focus so the phone keyboard can open from this tap.
    flushSync(() => {
      setTextBoxes(prev => [...prev, {
        id, text: '', color: markupColor, scale: 1,
        x: x > 55 ? x - 55 : x + 6, y: y >= 50 ? y - 31 : y + 15,
        anchor: { x, y },
      }]);
      setSelectedTextBoxId(id);
      setCalloutStatus('Callout added. Enter a note.');
    });
    calloutNoteRef.current?.focus();
  };

  const handleUpdateTextBoxText = (id: string, text: string) => {
    setTextBoxes(prev => prev.map(b => (b.id === id ? { ...b, text } : b)));
  };

  const handleDeleteTextBox = (id: string) => {
    setTextBoxes(prev => prev.filter(b => b.id !== id));
    if (selectedTextBoxId === id) {
      setSelectedTextBoxId(null);
    }
  };

  // Voice transcript reception
  const handleTranscriptReceived = (transcript: string) => {
    if (!transcript) return;
    setDescription(prev => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return transcript;
      }
      return `${trimmed}. ${transcript}`;
    });
  };

  // Setup Canvas when entering Markup Mode
  useEffect(() => {
    if (isMarkupActive && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      canvas.width = img.naturalWidth || img.clientWidth;
      canvas.height = img.naturalHeight || img.clientHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Save initial blank state
        setCanvasHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
    }
  }, [isMarkupActive]);

  // Canvas drawing handlers
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return lastPosRef.current || startPos || { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

    let clientX: number | undefined;
    let clientY: number | undefined;

    // In touch events, active touches are in e.touches, but on touchend e.touches is empty
    // and the ended touch is in e.changedTouches.
    if ('touches' in e && e.touches && e.touches.length > 0 && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches && e.changedTouches.length > 0 && e.changedTouches[0]) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e && typeof (e as React.MouseEvent<HTMLCanvasElement>).clientX === 'number') {
      clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    }

    if (clientX === undefined || clientY === undefined) {
      return lastPosRef.current || startPos || { x: 0, y: 0 };
    }

    const pos = {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
    lastPosRef.current = pos;
    return pos;
  };

  const placeCallout = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    if (movingCallout && selectedCallout) {
      moveCalloutTo(selectedCallout, x * imageSize.width, y * imageSize.height);
      setMovingCallout(false);
      setCalloutStatus('Callout moved');
    } else {
      addCallout(x * 100, y * 100);
    }
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isMarkupActive) return;

    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);
    setStartPos(coords);
    lastPosRef.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (markupTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = markupColor;
      ctx.lineWidth = Math.max(4, Math.round(canvas.width / 200));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMarkupActive || !startPos) return;
    const coords = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (markupTool === 'pen') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (canvasHistory.length > 0) {
      // Live preview for shape tools: restore snapshot before drawing preview
      const last = canvasHistory[canvasHistory.length - 1];
      ctx.putImageData(last, 0, 0);

      if (markupTool === 'rect') {
        ctx.strokeStyle = markupColor;
        ctx.lineWidth = Math.max(4, Math.round(canvas.width / 200));
        ctx.strokeRect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
      } else if (markupTool === 'arrow') {
        ctx.strokeStyle = markupColor;
        ctx.fillStyle = markupColor;
        ctx.lineWidth = Math.max(4, Math.round(canvas.width / 200));
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        const angle = Math.atan2(coords.y - startPos.y, coords.x - startPos.x);
        const headLen = Math.max(16, Math.round(canvas.width / 50));
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x - headLen * Math.cos(angle - Math.PI / 6), coords.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(coords.x - headLen * Math.cos(angle + Math.PI / 6), coords.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    }
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMarkupActive || !startPos) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoordinates(e);

    if (markupTool === 'rect') {
      ctx.strokeStyle = markupColor;
      ctx.lineWidth = Math.max(4, Math.round(canvas.width / 200));
      ctx.strokeRect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
    } else if (markupTool === 'arrow') {
      // Draw arrow from startPos to coords
      ctx.strokeStyle = markupColor;
      ctx.fillStyle = markupColor;
      ctx.lineWidth = Math.max(4, Math.round(canvas.width / 200));
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(coords.y - startPos.y, coords.x - startPos.x);
      const headLen = Math.max(16, Math.round(canvas.width / 50));
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x - headLen * Math.cos(angle - Math.PI / 6), coords.y - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(coords.x - headLen * Math.cos(angle + Math.PI / 6), coords.y - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    // Push new snapshot to history
    setCanvasHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setStartPos(null);
    lastPosRef.current = null;
  };

  const generateMergedImage = (withLabels = true): string => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!img) return currentImageFile;

    const naturalWidth = img.naturalWidth || canvas?.width || img.clientWidth || 800;
    const naturalHeight = img.naturalHeight || canvas?.height || img.clientHeight || 600;

    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = naturalWidth;
    mergeCanvas.height = naturalHeight;
    const mergeCtx = mergeCanvas.getContext('2d');
    if (!mergeCtx) return currentImageFile;

    // 1. Draw base unflattened image
    mergeCtx.drawImage(img, 0, 0, naturalWidth, naturalHeight);

    // 2. Draw canvas drawing strokes if any
    if (canvas) {
      mergeCtx.drawImage(canvas, 0, 0, naturalWidth, naturalHeight);
    }

    // 3. Draw text box annotations using exact displayed width to preserve on-screen scale
    const displayedWidth = imageRef.current?.clientWidth || canvas?.clientWidth || img.clientWidth || 500;
    if (withLabels) textBoxes.filter(box => box.text.trim()).forEach((box, index) => {
      drawTextBoxOnCanvas(mergeCtx, box, index, naturalWidth, naturalHeight, displayedWidth);
    });

    return mergeCanvas.toDataURL('image/jpeg', 0.92);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (canvas && canvasHistory.length > 1) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const nextHistory = canvasHistory.slice(0, -1);
        const last = nextHistory[nextHistory.length - 1];
        ctx.putImageData(last, 0, 0);
        setCanvasHistory(nextHistory);
        return;
      }
    }

    if (textBoxes.length > 0) {
      setTextBoxes(prev => prev.slice(0, -1));
      setSelectedTextBoxId(null);
    }
  };

  const handleApplyMarkup = () => {
    const merged = generateMergedImage();
    if (canvasHistory.length > 1) setBaseImageFile(generateMergedImage(false));
    const nonEmptyCallouts = textBoxes.filter(box => box.text.trim());
    appliedCallouts.current = nonEmptyCallouts;
    setTextBoxes(nonEmptyCallouts);
    setCurrentImageFile(merged);
    setMovingCallout(false);
    setIsMarkupActive(false);
    setSelectedTextBoxId(null);
  };

  const handleCancelMarkup = () => {
    setIsMarkupActive(false);
    setSelectedTextBoxId(null);
    setMovingCallout(false);
    setTextBoxes(appliedCallouts.current);
  };

  // Handle Save Photo Details
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const targetIssue = issues.find(i => i.id === selectedIssueId) || issue;
      const finalImage = isMarkupActive ? generateMergedImage() : currentImageFile;

      const updated: Photo = {
        ...photo,
        reportId: report.id,
        imageFile: finalImage,
        originalImageFile: photo.originalImageFile || photo.imageFile,
        markupImageFile: baseImageFile !== (photo.originalImageFile || photo.imageFile) ? baseImageFile : undefined,
        textBoxAnnotations: textBoxes,
        description: description.trim(),
        internalNotes: internalNotes.trim(),
        includeInReport,
        isReferenceImage: photo.isReferenceImage || false,
        issueId: targetIssue.id,
        issueNumber: targetIssue.issueNumber,
        jobReference: report.jobReference,
        capturedAt: capturedAt !== undefined ? capturedAt : (photo.capturedAt ?? null),
      };

      const ok = await onSavePhoto(updated);
      if (ok) {
        setSaveSuccess(true);
        onBack();
      } else {
        setSaveError('Failed to save photo updates. Please retry.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error occurred while saving photo details.');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm and execute Photo deletion
  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const ok = await onDeletePhoto(photo.id);
      if (!ok) {
        setDeleteError('Failed to delete photo from storage. Please try again.');
        setIsDeleting(false);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error occurred while deleting photo.');
      setIsDeleting(false);
    }
  };

  // Derive linked issue representation
  const linkedIssue = issues.find(i => i.id === selectedIssueId) || issue;
  const linkedIssueNumStr = `Issue ${String(linkedIssue.issueNumber).padStart(2, '0')}`;
  const linkedIssueLabel = `${linkedIssueNumStr} · ${linkedIssue.issueName || 'Inspection Defect Record'}`;

  // Evidence sequence and position within the issue's evidence collection
  const photoIndex = (photos || []).findIndex(p => p.id === photo.id);
  const evidenceNumber = photo.sequenceNumber ?? (photoIndex >= 0 ? photoIndex + 1 : 1);
  const totalPhotosCount = (photos && photos.length > 0) ? photos.length : 1;
  const evidenceNumStr = `EVIDENCE #${String(evidenceNumber).padStart(2, '0')}`;

  const hasPrev = photoIndex > 0;
  const hasNext = photoIndex >= 0 && photoIndex < photos.length - 1;

  return (
    <div className="field-editor field-photo-editor w-full max-w-3xl lg:max-w-4xl mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-5 sm:space-y-7 pb-36 sm:pb-40">
      {/* Header: Back navigation to Issue Detail and report reference */}
      <div className="app-detail-bar flex items-center justify-between gap-3 pb-3 border-b border-[#152128]/10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#152128]/15 bg-white hover:bg-[#F4F6F8] active:bg-[#E5E8EB] text-[#152128] font-mono font-bold text-xs uppercase tracking-wider touch-manipulation min-h-[44px] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6990FF]/30"
          aria-label="Return to issue detail"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          <span>ISSUE {String(issue.issueNumber).padStart(2, '0')}</span>
        </button>

        <span className="app-detail-title">Evidence</span>
        <div className="app-detail-reference flex items-center gap-2">
          {photos && photos.length > 1 && (
            <span className="text-[11px] font-mono font-semibold text-[#152128]/70 bg-white px-2.5 py-1 rounded-md border border-[#152128]/15">
              {photoIndex + 1} of {photos.length}
            </span>
          )}
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#152128]/50 hidden sm:inline-block">
            REPORT REF:
          </span>
          <span className="font-mono font-bold text-xs sm:text-sm text-[#152128] bg-white px-2.5 py-1 rounded-md border border-[#152128]/15 inline-block">
            {report.jobReference}
          </span>
        </div>
      </div>

      {/* 1. TOP BRANDED EVIDENCE IDENTITY BLOCK (SKY CYAN SURFACE) */}
      <header className="app-card app-card-tint w-full bg-[#B9E6F5] p-4 sm:p-5 space-y-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-xs uppercase tracking-[0.2em] text-[#152128]">
              PHOTO {evidenceNumber}
            </span>
            <span className="text-[#152128]/30 font-mono text-xs">·</span>
            <span className="font-mono text-xs uppercase tracking-wider text-[#152128]/75">
              Evidence #{String(evidenceNumber).padStart(2, '0')}
            </span>
            <span className="text-[#152128]/30 font-mono text-xs">·</span>
            {/* Clear indication that evidence type is a photograph */}
            <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] uppercase tracking-wider text-[#152128]/80 bg-white/60 px-2 py-0.5 rounded border border-[#152128]/10">
              <Camera className="w-3 h-3 stroke-[2.2]" />
              <span>Photograph Evidence</span>
            </span>
          </div>

          <span className="font-mono text-xs text-[#152128]/70 bg-white/70 px-2.5 py-0.5 rounded border border-[#152128]/10">
            FIELD EVIDENCE
          </span>
        </div>

        {/* Linked issue clearly visible: "Issue 01 · Structural Foundation Crack" */}
        <div className="pt-1">
          <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#152128]/60 mb-0.5">
            LINKED DEFECT ISSUE
          </span>
          <h1
            title={linkedIssueLabel}
            className="text-lg sm:text-2xl font-brand font-bold text-[#152128] tracking-tight leading-snug break-words"
          >
            {linkedIssueLabel}
          </h1>
        </div>

        <div className="pt-2 border-t border-[#152128]/15 flex items-center justify-between text-xs text-[#152128] flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-[#152128]/60 shrink-0" />
            <span className="text-[11px] font-mono text-[#152128]/75 uppercase">
              CAPTURED:
            </span>
            <span className={`text-[11px] font-mono ${capturedAt ? 'font-semibold text-[#152128]' : 'text-[#152128]/55 italic'}`}>
              {formatCaptureDateTime(capturedAt)}
            </span>
          </div>
          <span className="font-mono font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-[#152128]/15">
            {report.jobReference}
          </span>
        </div>
      </header>

      {/* 2. PHOTOGRAPH DISPLAY - PRIMARY VISUAL ELEMENT OF THE PAGE */}
      <section className="space-y-3 pt-0.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#061D24]">
              EVIDENCE PHOTOGRAPH
            </h2>
          </div>

          {/* Draw / Markup action directly associated with the photograph */}
          <div>
            {!isMarkupActive ? (
              <button
                type="button"
                onClick={() => setIsMarkupActive(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-[#F4F6F8] active:bg-[#E5E8EB] border border-[#152128]/20 hover:border-[#152128] rounded-lg text-xs sm:text-sm font-bold text-[#152128] transition-colors cursor-pointer touch-manipulation min-h-[44px] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#6990FF]/30"
                aria-label="Draw or markup photographic evidence"
              >
                <PenTool className="w-4 h-4 text-[#6990FF] stroke-[2.2]" />
                <span>Draw / Markup</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#6990FF]/10 border border-[#6990FF]/30 rounded-lg text-xs sm:text-sm font-bold text-[#6990FF] font-mono min-h-[44px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6990FF] animate-pulse" />
                <span>Markup Mode</span>
              </span>
            )}
          </div>
        </div>

        {/* Markup Toolbar when active */}
        {isMarkupActive && (
          <div className="app-card app-card-dark markup-toolbar bg-[#152128] text-white p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-[#152128]">
            <div className="markup-tool-options" role="group" aria-label="Markup tools">
              <button
                type="button"
                onClick={() => setMarkupTool('pen')}
                aria-pressed={markupTool === 'pen'}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  markupTool === 'pen' ? 'bg-[#6990FF] text-[#152128]' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                Freehand
              </button>
              <button
                type="button"
                onClick={() => setMarkupTool('arrow')}
                aria-pressed={markupTool === 'arrow'}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  markupTool === 'arrow' ? 'bg-[#6990FF] text-[#152128]' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                Arrow
              </button>
              <button
                type="button"
                onClick={() => setMarkupTool('rect')}
                aria-pressed={markupTool === 'rect'}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  markupTool === 'rect' ? 'bg-[#6990FF] text-[#152128]' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                Box
              </button>
              <button
                type="button"
                onClick={() => { setMarkupTool('text'); setMovingCallout(false); }}
                aria-pressed={markupTool === 'text'}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  markupTool === 'text' ? 'bg-[#6990FF] text-[#152128]' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Callout</span>
              </button>

            </div>
            <div className="markup-color-options" role="group" aria-label="Markup colors">
              <button
                type="button"
                onClick={() => handleColorChange('#EF4444')}
                className={`markup-swatch w-6 h-6 rounded-full bg-rose-500 border-2 cursor-pointer ${
                  markupColor === '#EF4444' ? 'border-white scale-110' : 'border-transparent'
                }`}
                aria-label="Signal red"
                aria-pressed={markupColor === '#EF4444'}
              />
              <button
                type="button"
                onClick={() => handleColorChange('#FACC15')}
                className={`markup-swatch w-6 h-6 rounded-full bg-amber-400 border-2 cursor-pointer ${
                  markupColor === '#FACC15' ? 'border-white scale-110' : 'border-transparent'
                }`}
                aria-label="Caution yellow"
                aria-pressed={markupColor === '#FACC15'}
              />
              <button
                type="button"
                onClick={() => handleColorChange('#6990FF')}
                className={`markup-swatch w-6 h-6 rounded-full bg-[#6990FF] border-2 cursor-pointer ${
                  markupColor === '#6990FF' ? 'border-white scale-110' : 'border-transparent'
                }`}
                aria-label="Sydney Sky"
                aria-pressed={markupColor === '#6990FF'}
              />
            </div>

            <div className="markup-actions field-action-dock">
              <button
                type="button"
                onClick={handleUndo}
                disabled={canvasHistory.length <= 1 && textBoxes.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleApplyMarkup}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#6990FF] hover:bg-[#527AE8] active:bg-[#4466C9] text-[#152128] text-xs font-bold cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
              <button
                type="button"
                onClick={handleCancelMarkup}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white cursor-pointer"
                aria-label="Cancel markup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {markupTool === 'text' && (
              <div className="w-full text-[11px] font-mono text-[#B9E6F5]/90 pt-1.5 border-t border-white/15 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[#6990FF] shrink-0" />
                <span>Click or tap anywhere on the photo to place a text box. Drag handle to move, click text to edit.</span>
              </div>
            )}
          </div>
        )}

        {/* Dominant Photograph Presentation: centered, properly contained, responsive screen space */}
        <div className="app-card app-card-dark relative w-full bg-[#152128] overflow-hidden flex items-center justify-center sm:min-h-[320px]">
          <div ref={imageContainerRef} className="relative inline-block max-w-full">
            <img
              ref={imageRef}
              src={isMarkupActive ? baseImageFile : currentImageFile}
              alt={description || `Evidence photo for ${linkedIssueLabel}`}
              className="evidence-editor-image select-none"
            />

            {/* Interactive Canvas Overlay in Markup Mode */}
            {isMarkupActive && (
              <canvas
                ref={canvasRef}
                onClick={markupTool === 'text' ? placeCallout : undefined}
                onMouseDown={markupTool !== 'text' ? handlePointerDown : undefined}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={markupTool !== 'text' ? handlePointerDown : undefined}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onTouchCancel={handlePointerUp}
                className={`absolute inset-0 w-full h-full touch-none z-10 ${
                  markupTool === 'text' ? 'cursor-text' : 'cursor-crosshair'
                }`}
              />
            )}


            {isMarkupActive && calloutMeasure.current && imageSize.width > 0 && textBoxes.map((box, index) => {
              const layout = layoutCallout(calloutMeasure.current!, box, imageSize.width, imageSize.height);
              const { anchor, lineStart, left, top, labelWidth, labelHeight, size, lineHeight, lines } = layout;
              const isSelected = selectedTextBoxId === box.id;
              const dx = anchor && lineStart ? anchor.x - lineStart.x : 0;
              const dy = anchor && lineStart ? anchor.y - lineStart.y : 0;
              const number = String(index + 1).padStart(2, '0');

              return (
                <React.Fragment key={box.id}>
                  {anchor && lineStart && (
                    <>
                      <span aria-hidden="true" className="callout-leader" style={{
                        left: lineStart.x, top: lineStart.y, width: Math.hypot(dx, dy),
                        transform: `rotate(${Math.atan2(dy, dx)}rad)`, backgroundColor: box.color,
                      }} />
                      <span aria-hidden="true" className="callout-pin" style={{ left: anchor.x, top: anchor.y, backgroundColor: box.color }} />
                    </>
                  )}
                  <button
                    type="button"
                    className="evidence-callout"
                    aria-label={`Callout ${number}: ${box.text.trim() || 'Empty note'}. Select to edit. Use arrow keys to move.`}
                    aria-pressed={isSelected}
                    style={{ left, top, width: labelWidth, height: labelHeight, fontSize: size, lineHeight: `${lineHeight}px` }}
                    onClick={event => {
                      if (event.detail > 0 && dragMoved.current) return;
                      flushSync(() => { setSelectedTextBoxId(box.id); setMovingCallout(false); setMarkupTool('text'); });
                      calloutNoteRef.current?.focus();
                    }}
                    onPointerDown={event => {
                      if (!event.isPrimary || event.button !== 0) return;
                      dragMoved.current = false;
                      dragOrigin.current = { id: box.id, x: event.clientX, y: event.clientY, left, top };
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setSelectedTextBoxId(box.id);
                      setMovingCallout(false);
                      setMarkupTool('text');
                    }}
                    onPointerMove={event => {
                      const start = dragOrigin.current;
                      if (!start || start.id !== box.id || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
                      const dx = event.clientX - start.x;
                      const dy = event.clientY - start.y;
                      if (!dragMoved.current && Math.hypot(dx, dy) < 4) return;
                      dragMoved.current = true;
                      moveCalloutTo(box, start.left + dx, start.top + dy);
                    }}
                    onLostPointerCapture={() => { dragOrigin.current = null; }}
                    onKeyDown={event => {
                      const offset = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[event.key];
                      if (!offset) return;
                      event.preventDefault();
                      moveCalloutTo(box, left + offset[0], top + offset[1]);
                      setCalloutStatus(`Callout moved ${event.key.slice(5).toLowerCase()}`);
                    }}
                  >
                    <span aria-hidden="true" className="callout-number" style={{ backgroundColor: box.color }}>{number}</span>
                    <span aria-hidden="true" className="callout-copy">{lines.join('\n')}</span>
                    {isSelected && <Move aria-hidden="true" size={12} className="callout-grip" />}
                  </button>
                  {isSelected && (
                    <button
                      type="button"
                      className="callout-resize"
                      aria-label={`Resize callout ${number}. Use left or right arrow keys.`}
                      style={{ left: left + labelWidth - 44, top: clamp(top + labelHeight - 18, 0, imageSize.height - 44) }}
                      onPointerDown={event => {
                        if (!event.isPrimary || event.button !== 0) return;
                        resizeOrigin.current = { clientX: event.clientX, width: labelWidth };
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={event => {
                        const start = resizeOrigin.current;
                        if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
                        resizeCallout(box.id, start.width + event.clientX - start.clientX);
                      }}
                      onLostPointerCapture={() => { resizeOrigin.current = null; }}
                      onKeyDown={event => {
                        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                        event.preventDefault();
                        resizeCallout(box.id, labelWidth + (event.key === 'ArrowRight' ? 12 : -12));
                      }}
                    >
                      <span><MoveHorizontal size={14} aria-hidden="true" /></span>
                    </button>
                  )}
                </React.Fragment>
              );
            })}

          </div>
        </div>

        <p className="sr-only" role="status">{calloutStatus}</p>
        {isMarkupActive && markupTool === 'text' && (
          <section className="app-card callout-inspector" aria-label="Callout editor">
            {selectedCallout ? (
              <>
                <label htmlFor="evidence-callout-note">Callout note</label>
                <textarea ref={calloutNoteRef} id="evidence-callout-note" rows={2} maxLength={120}
                  value={selectedCallout.text}
                  placeholder="e.g. Sealant split at window frame"
                  onChange={event => handleUpdateTextBoxText(selectedCallout.id, event.target.value)}
                />
                <div className="callout-inspector-actions">
                  <button type="button" aria-label="Smaller callout text" onClick={() => setTextBoxes(prev => prev.map(box =>
                    box.id === selectedCallout.id ? { ...box, scale: clamp((box.scale ?? 1) - .15, .65, 2.5) } : box
                  ))}><Minus size={17} aria-hidden="true" /></button>
                  <button type="button" aria-label="Larger callout text" onClick={() => setTextBoxes(prev => prev.map(box =>
                    box.id === selectedCallout.id ? { ...box, scale: clamp((box.scale ?? 1) + .15, .65, 2.5) } : box
                  ))}><Plus size={17} aria-hidden="true" /></button>
                  <button type="button" aria-pressed={movingCallout} onClick={() => setMovingCallout(prev => !prev)}>
                    <Move size={16} aria-hidden="true" /><span>Move label</span>
                  </button>
                  <button type="button" aria-label="Remove callout" onClick={() => {handleDeleteTextBox(selectedCallout.id); setMovingCallout(false);}}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
                <p>{movingCallout ? 'Tap where you want the label. The pin stays in place.' : 'Drag the label to move it. Drag the corner to change its width.'}</p>
              </>
            ) : (
              <div className="callout-empty">
                <MapPin size={20} aria-hidden="true" />
                <p>Tap the photo to add text.</p>
                <button type="button" onClick={() => addCallout(50, 50)}>Add text</button>
              </div>
            )}
          </section>
        )}

      </section>

      {/* 3. OBSERVATION & NOTES SECTION */}
      <section className="space-y-3 pt-1">
        <div className="border-b border-[#152128]/10 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#152128]">
              OBSERVATIONS &amp; NOTES
            </h2>
          </div>
        </div>

        <div className="app-card bg-white p-4 sm:p-5 shadow-2xs space-y-4">
          {/* 1. Voice input first: Describe by Voice is the most prominent input method positioned before text entry */}
          <div className="space-y-1.5 pb-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#152128]/75">
                Voice Dictation
              </label>
              <span className="text-[11px] font-mono text-[#152128]/50">
                Tap to speak notes
              </span>
            </div>
            <VoiceTranscriptionControl onTranscriptReceived={handleTranscriptReceived} />
          </div>

          {/* 2. Defect Observation (Appears in report) */}
          <div className="pt-2 border-t border-[#152128]/10">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  htmlFor="photo_description_textarea"
                  className="block text-xs sm:text-sm font-bold text-[#152128]"
                >
                  Defect Observation
                </label>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Appears in report
                </span>
              </div>
              {/* Live Character Counter: 250 recommended limit with overflow tracking */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] flex-wrap">
                <span className={isDescOverLimit ? 'font-bold text-red-600' : 'text-[#152128]/60 font-medium'}>
                  {descCharCount} / 250
                </span>
                {isDescOverLimit && (
                  <span className="font-semibold text-red-600 bg-red-50 border border-red-200/80 px-1.5 py-0.5 rounded text-[10px]">
                    {descOverflowCount} {descOverflowCount === 1 ? 'character' : 'characters'} over limit
                  </span>
                )}
              </div>
            </div>

            {/* Photo Description textarea with live 250-char limit & red overflow styling */}
            <div className="relative w-full bg-white rounded-lg">
              {isDescOverLimit && (
                <div
                  ref={descriptionBackdropRef}
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full text-base font-normal px-3.5 py-3 rounded-lg leading-relaxed break-words whitespace-pre-wrap overflow-hidden pointer-events-none select-none border border-transparent"
                  style={{
                    paddingRight: `${14 + descriptionScrollbarOffset}px`,
                  }}
                >
                  <span className="text-[#152128]">{descValidText}</span>
                  <span className="text-red-600 bg-red-500/10 font-normal">
                    {descOverflowText}
                    {description.endsWith('\n') ? ' ' : ''}
                  </span>
                </div>
              )}
              <textarea
                id="photo_description_textarea"
                ref={descriptionTextareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onScroll={syncDescriptionScroll}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                rows={5}
                placeholder="Describe observed defect, physical condition, and field findings..."
                className={`w-full text-base font-normal px-3.5 py-3 rounded-lg border outline-none transition-colors min-h-[140px] leading-relaxed break-words whitespace-pre-wrap relative z-[1] selection:bg-[#6990FF]/30 ${
                  isDescOverLimit
                    ? 'bg-transparent text-transparent caret-[#152128] border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-white text-[#152128] border-[#152128]/20 focus:border-[#6990FF] focus:ring-2 focus:ring-[#6990FF]/20'
                }`}
              />
            </div>
          </div>

          {/* Include in Photo Report Toggle */}
          <div
            role="switch"
            aria-checked={includeInReport}
            tabIndex={0}
            onClick={() => setIncludeInReport(!includeInReport)}
            onKeyDown={e => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setIncludeInReport(!includeInReport);
              }
            }}
            className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 cursor-pointer select-none ${
              includeInReport
                ? 'bg-[#F0F7FF] border-[#6990FF]/30 hover:bg-[#E8F2FD]'
                : 'bg-[#F8FAFC] border-[#152128]/15 hover:bg-[#F1F5F9]'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="block text-xs sm:text-sm font-semibold text-[#152128]">
                  Include in Photo Report
                </span>
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    includeInReport
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {includeInReport ? 'Appears in report' : 'Excluded from report'}
                </span>
              </div>
              <span className="block text-[11px] text-[#152128]/60 font-normal mt-0.5">
                {includeInReport
                  ? 'This photo and observation will be published in client reports.'
                  : 'Excluded from exported reports (preserved in field archive).'}
              </span>
            </div>
            <div
              className={`relative inline-flex h-[26px] w-[46px] items-center rounded-full p-[3px] transition-colors duration-200 ease-in-out flex-shrink-0 ${
                includeInReport ? 'bg-[#6990FF]' : 'bg-[#CBD5E1]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  includeInReport ? 'translate-x-[20px]' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* 3. Surveyor Field Notes (Internal only) */}
          <div className="pt-3 border-t border-[#152128]/10">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  htmlFor="photo_internal_notes_textarea"
                  className="block text-xs sm:text-sm font-bold text-[#152128]"
                >
                  Surveyor Field Notes
                </label>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  Internal only
                </span>
              </div>
              <span className="text-[11px] text-[#152128]/50 font-mono">
                Not visible in client report
              </span>
            </div>
            <textarea
              id="photo_internal_notes_textarea"
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              rows={3}
              placeholder="Private surveyor notes, diagnostics, internal reminders..."
              className="w-full text-base font-normal px-3.5 py-2.5 bg-[#F8FAFC] border border-[#152128]/20 rounded-lg text-[#152128] focus:border-[#6990FF] focus:ring-2 focus:ring-[#6990FF]/20 outline-none transition-all leading-relaxed"
            />
          </div>
        </div>
      </section>

      {/* 4. METADATA & REASSIGNMENT - Visually secondary to photo and observation */}
      <section className="space-y-3 pt-1">
        <div className="border-b border-[#152128]/10 pb-2">
          <h2 className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#152128]/70">
            METADATA &amp; REASSIGNMENT
          </h2>
        </div>

        <div className="app-card bg-white p-4 sm:p-5 space-y-4">
          {/* Original Photo Capture Date & Time Metadata */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#152128]/75 mb-1.5">
              Original Photo Capture Date &amp; Time
            </label>
            <div className="flex items-center gap-2 text-xs font-mono bg-[#F8FAFC] border border-[#152128]/15 px-3.5 py-2.5 rounded-lg text-[#152128]">
              <Clock className="w-4 h-4 text-[#152128]/50 shrink-0" />
              {capturedAt ? (
                <span className="font-semibold text-[#152128]">{formatCaptureDateTime(capturedAt)}</span>
              ) : (
                <span className="text-[#152128]/50 italic">Capture date/time unavailable</span>
              )}
            </div>
          </div>

          {/* Reassign Issue Selector */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#152128]/75 mb-1.5">
              Associated Defect Issue
            </label>
            {issues.length > 0 ? (
              <AssuredSelect
                id="photo_associated_issue_select"
                value={selectedIssueId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedIssueId(e.target.value)}
                aria-label="Associated Defect Issue"
              >
                {issues.map(iss => (
                  <option key={iss.id} value={iss.id}>
                    Issue {String(iss.issueNumber).padStart(2, '0')}: {iss.issueName || '(Untitled Defect)'}
                  </option>
                ))}
              </AssuredSelect>
            ) : (
              <div className="p-3 bg-[#F4F6F8] rounded-lg border border-[#152128]/15 text-xs font-mono text-[#152128]">
                Issue {issue.issueNumber}: {issue.issueName || 'Current Defect'}
              </div>
            )}
          </div>

          {/* Technical Storage Reference: Hidden behind an optional "Technical Details" disclosure */}
          <div className="pt-3 border-t border-[#152128]/10">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(prev => !prev)}
              className="inline-flex items-center justify-between w-full text-left py-1 text-xs font-mono font-bold text-[#152128]/60 hover:text-[#152128] cursor-pointer touch-manipulation"
              aria-expanded={showTechnicalDetails}
            >
              <span className="uppercase tracking-wider">Technical Details</span>
              {showTechnicalDetails ? (
                <ChevronUp className="w-4 h-4 text-[#152128]/60" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#152128]/60" />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2.5 p-3 bg-[#F4F6F8] rounded-lg border border-[#152128]/10 text-[11px] font-mono space-y-1.5 text-[#152128]/75">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#152128]/50">ORIGINAL CAPTURE:</span>
                  <span className={`truncate max-w-[65%] ${capturedAt ? 'font-semibold text-[#152128]' : 'text-[#152128]/40 italic'}`}>
                    {formatCaptureDateTime(capturedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#152128]/50">STORAGE REF:</span>
                  <span className="truncate max-w-[65%] font-semibold text-[#152128]">
                    {photo.storageUri || `${report.jobReference}_P${photo.issueNumber}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#152128]/50">EVIDENCE ID:</span>
                  <span className="truncate max-w-[65%] text-[#152128]/70">{photo.id}</span>
                </div>
                {photo.createdAt && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#152128]/50">RECORDED:</span>
                    <span>{new Date(photo.createdAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. SECONDARY DESTRUCTIVE ACTION: DELETE PHOTO */}
      <div className="pt-6 sm:pt-8 border-t border-[#152128]/10">
        <button
          type="button"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-rose-50/60 active:bg-rose-100/60 border border-[#152128]/15 hover:border-rose-300 text-[#152128]/70 hover:text-rose-700 font-semibold text-xs min-h-[44px] transition-colors touch-manipulation cursor-pointer flex items-center justify-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
          <span>Delete Photo</span>
        </button>

        {deleteError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs font-semibold">
            {deleteError}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Delete Photo */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Photo"
        message="Delete this photo?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {/* 6. FIXED BOTTOM ACTIONS: COORDINATED EVIDENCE NAVIGATION & PRIMARY SAVE PHOTO */}
      <div
        hidden={isMarkupActive}
        className="field-action-dock"
      >
        <div className="photo-dock w-full max-w-3xl lg:max-w-4xl mx-auto flex flex-col gap-2">
          {saveError && (
            <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Sequential Evidence Navigation (Previous / Position / Next) */}
          {onSelectPhoto && photos && photos.length > 0 && (
            <div className="photo-dock-navigation">
              {/* Previous Photo Button */}
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => {
                  if (hasPrev && onSelectPhoto && photos) {
                    onSelectPhoto(photos[photoIndex - 1].id);
                  }
                }}
                className="inline-flex items-center justify-center gap-1 px-3 sm:px-4 py-2 rounded-lg border border-[#152128]/20 bg-white hover:bg-[#F4F6F8] active:bg-[#E5E8EB] disabled:opacity-30 disabled:border-[#152128]/10 disabled:bg-[#F8FAFC] disabled:cursor-not-allowed text-[#152128] font-mono font-bold text-xs uppercase tracking-wider min-h-[44px] min-w-[76px] touch-manipulation transition-colors cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#6990FF]/30"
                title="Previous Evidence Photo"
                aria-label="Previous Evidence Photo"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden min-[360px]:inline">Prev</span>
              </button>

              {/* Current Position (e.g. "1 of 10") */}
              <div className="flex flex-col items-center justify-center text-center px-2 min-w-0 select-none">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#152128]/55 font-bold">
                  EVIDENCE
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-[#152128] tracking-tight">
                  {photoIndex >= 0 ? photoIndex + 1 : 1} of {totalPhotosCount}
                </span>
              </div>

              {/* Next Photo Button */}
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => {
                  if (hasNext && onSelectPhoto && photos) {
                    onSelectPhoto(photos[photoIndex + 1].id);
                  }
                }}
                className="inline-flex items-center justify-center gap-1 px-3 sm:px-4 py-2 rounded-lg border border-[#152128]/20 bg-white hover:bg-[#F4F6F8] active:bg-[#E5E8EB] disabled:opacity-30 disabled:border-[#152128]/10 disabled:bg-[#F8FAFC] disabled:cursor-not-allowed text-[#152128] font-mono font-bold text-xs uppercase tracking-wider min-h-[44px] min-w-[76px] touch-manipulation transition-colors cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#6990FF]/30"
                title="Next Evidence Photo"
                aria-label="Next Evidence Photo"
              >
                <span className="hidden min-[360px]:inline">Next</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Primary Save Photo Action */}
          <button
            type="button"
            id="btn_save_photo"
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full py-3.5 px-5 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider min-h-[52px] flex items-center justify-center gap-2 transition-all touch-manipulation cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#6990FF]/25 shadow-sm ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#6990FF] hover:bg-[#527AE8] active:bg-[#4466C9] text-[#152128]'
            } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Photo...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Photo Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.2]" />
                <span>Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
