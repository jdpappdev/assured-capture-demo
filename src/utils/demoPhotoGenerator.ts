/** Local illustrative evidence for the fictional reports. */

export interface DemoPhotoConfig {
  category:
    | 'concrete'
    | 'water'
    | 'sealant'
    | 'firestop'
    | 'roof'
    | 'timber'
    | 'cladding'
    | 'shutter'
    | 'electrical'
    | 'plumbing'
    | 'asphalt'
    | 'drainage'
    | 'retaining'
    | 'facade_cover';
  subType?: string;
  title: string;
  callout?: string;
  jobReference: string;
  timestamp: string;
  issueNumber: number;
  photoNumber: number;
}

const LOCAL_EVIDENCE: Record<string, string> = {
  "photo-1590381105924-c72589b9ef3f": "photo-1590381105924-c72589b9ef3f",
  "photo-1584622650111-993a426fbf0a": "photo-1584622650111-993a426fbf0a",
  "photo-1486406146926-c627a92ad1ab": "photo-1486406146926-c627a92ad1ab",
  "photo-1541888946425-d0fbb18f86f7": "photo-1600585154340-be6161a56a0c",
  "photo-1600585154340-be6161a56a0c": "photo-1600585154340-be6161a56a0c",
  "photo-1546484396-fb3fc6f95f98": "photo-1546484396-fb3fc6f95f98",
  "photo-1513694203232-719a280e022f": "photo-1513694203232-719a280e022f",
  "photo-1504307651254-35680f356dfd": "photo-1504307651254-35680f356dfd",
  "photo-1558494949-ef010cbdcc31": "photo-1558494949-ef010cbdcc31",
  "photo-1524813686514-a57563d77840": "photo-1512917774080-9991f1c4c750",
  "photo-1578874691223-64358edb554e": "photo-1590381105924-c72589b9ef3f",
  "photo-1517646456261-0428d098cb9b": "photo-1584622650111-993a426fbf0a",
  "photo-1503387762-592deb58ef4e": "photo-1503387762-592deb58ef4e",
  "photo-1512917774080-9991f1c4c750": "photo-1512917774080-9991f1c4c750"
};
const UNIQUE_PHOTOS = Object.values(LOCAL_EVIDENCE).map(id => `/demo-evidence/${id}.jpg`);

export function resolveDemoImage(source: string): string {
  const id = /^https:\/\/images\.unsplash\.com\/(photo-[^?/#]+)/.exec(source)?.[1];
  return id && LOCAL_EVIDENCE[id] ? `/demo-evidence/${LOCAL_EVIDENCE[id]}.jpg` : source;
}

export function generateDemoPhotoDataUrl(config: DemoPhotoConfig): string {
  const { jobReference, issueNumber, photoNumber } = config;
  
  // Explicitly assign unique, varied cover photos for each report (issueNumber === 0)
  if (issueNumber === 0) {
    if (jobReference === 'DEMO26-001') return UNIQUE_PHOTOS[2]; // Commercial Facade
    if (jobReference === 'DEMO26-002') return UNIQUE_PHOTOS[4]; // Residential Roof/Exterior
    if (jobReference === 'DEMO26-003') return UNIQUE_PHOTOS[6]; // Industrial Warehouse Cladding
    if (jobReference === 'DEMO26-004') return UNIQUE_PHOTOS[8]; // Apartment Snagging Interior
    if (jobReference === 'DEMO26-005') return UNIQUE_PHOTOS[10]; // Civil Drainage Infrastructure
  }

  // Deterministic index for all other photos
  let hash = 0;
  const str = `${jobReference}_iss${issueNumber}_p${photoNumber}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  
  const index = Math.abs(hash) % UNIQUE_PHOTOS.length;
  return UNIQUE_PHOTOS[index];
}
