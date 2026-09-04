export type ACIExposureClass = 'F0'|'F1'|'F2'|'F3'|'S0'|'S1'|'S2'|'S3-1'|'S3-2'|'W0'|'W1'|'W2'|'C0'|'C1'|'C2';
export type ACIExposureCategory = 'F'|'S'|'W'|'C';

export interface ACIExposureRequirement {
  code: ACIExposureClass;
  category: ACIExposureCategory;
  labelFa: string;
  conditionFa: string;
  maxWcm: number|null;
  minFcMpa: number;
  chlorideNonPrestressedPercent?: number;
  chloridePrestressedPercent?: number;
  cementRequirementFa?: string;
  calciumChloridePermitted?: boolean;
}

/**
 * ACI CODE-318-25 Chapter 19 durability dataset.
 * Numeric values are stored as factual rule data, not copied commentary text.
 * Primary references: Tables 19.3.1.1, 19.3.2.1 and 19.3.3.1.
 */
export const ACI_318_25_EXPOSURE: Record<ACIExposureClass, ACIExposureRequirement> = {
  F0:{code:'F0',category:'F',labelFa:'بدون چرخه یخ‌زدگی/ذوب',conditionFa:'بتن در معرض چرخه یخ‌زدگی و ذوب نیست.',maxWcm:null,minFcMpa:17},
  F1:{code:'F1',category:'F',labelFa:'یخ‌زدگی/ذوب با تماس محدود آب',conditionFa:'چرخه یخ‌زدگی و ذوب با تماس محدود با آب.',maxWcm:0.55,minFcMpa:24},
  F2:{code:'F2',category:'F',labelFa:'یخ‌زدگی/ذوب با تماس مکرر آب',conditionFa:'چرخه یخ‌زدگی و ذوب با تماس مکرر با آب.',maxWcm:0.45,minFcMpa:31},
  F3:{code:'F3',category:'F',labelFa:'یخ‌زدگی شدید همراه مواد یخ‌زدا',conditionFa:'چرخه یخ‌زدگی و ذوب با تماس مکرر آب و مواد یخ‌زدا.',maxWcm:0.40,minFcMpa:35},
  S0:{code:'S0',category:'S',labelFa:'سولفات ناچیز',conditionFa:'SO₄ محلول خاک <0.10% و آب <150 ppm.',maxWcm:null,minFcMpa:17,cementRequirementFa:'بدون محدودیت نوع سیمان',calciumChloridePermitted:true},
  S1:{code:'S1',category:'S',labelFa:'سولفات متوسط',conditionFa:'خاک 0.10 تا کمتر از 0.20%، یا آب 150 تا کمتر از 1500 ppm / آب دریا.',maxWcm:0.50,minFcMpa:28,cementRequirementFa:'ASTM C150 Type II یا سیمان با رده MS',calciumChloridePermitted:true},
  S2:{code:'S2',category:'S',labelFa:'سولفات شدید',conditionFa:'خاک 0.20 تا 2.00%، یا آب 1500 تا 10000 ppm.',maxWcm:0.45,minFcMpa:31,cementRequirementFa:'ASTM C150 Type V یا سیمان با رده HS',calciumChloridePermitted:false},
  'S3-1':{code:'S3-1',category:'S',labelFa:'سولفات بسیار شدید — گزینه ۱',conditionFa:'خاک >2.00% یا آب >10000 ppm.',maxWcm:0.45,minFcMpa:31,cementRequirementFa:'Type V همراه پوزولان/سرباره یا سیستم HS همراه SCM تأییدشده',calciumChloridePermitted:false},
  'S3-2':{code:'S3-2',category:'S',labelFa:'سولفات بسیار شدید — گزینه ۲',conditionFa:'خاک >2.00% یا آب >10000 ppm.',maxWcm:0.40,minFcMpa:35,cementRequirementFa:'Type V یا سیمان با رده HS مطابق الزامات آزمون مقاومت سولفاتی',calciumChloridePermitted:false},
  W0:{code:'W0',category:'W',labelFa:'خشک در بهره‌برداری',conditionFa:'بتن در بهره‌برداری خشک است.',maxWcm:null,minFcMpa:17},
  W1:{code:'W1',category:'W',labelFa:'تماس با آب بدون الزام نفوذپذیری کم',conditionFa:'بتن با آب تماس دارد ولی نفوذپذیری کم الزام نشده است.',maxWcm:null,minFcMpa:17},
  W2:{code:'W2',category:'W',labelFa:'تماس با آب با الزام نفوذپذیری کم',conditionFa:'بتن با آب تماس دارد و نفوذپذیری کم لازم است.',maxWcm:0.50,minFcMpa:28},
  C0:{code:'C0',category:'C',labelFa:'خشک/محافظت‌شده از رطوبت',conditionFa:'بتن خشک یا در برابر رطوبت محافظت شده است.',maxWcm:null,minFcMpa:17,chlorideNonPrestressedPercent:1.00,chloridePrestressedPercent:0.06},
  C1:{code:'C1',category:'C',labelFa:'مرطوب بدون منبع خارجی کلرید',conditionFa:'بتن در معرض رطوبت است ولی منبع خارجی کلرید ندارد.',maxWcm:null,minFcMpa:17,chlorideNonPrestressedPercent:0.30,chloridePrestressedPercent:0.06},
  C2:{code:'C2',category:'C',labelFa:'مرطوب با منبع خارجی کلرید',conditionFa:'بتن در معرض رطوبت و کلرید خارجی مانند نمک/آب شور/دریا/مواد یخ‌زدا است.',maxWcm:0.40,minFcMpa:35,chlorideNonPrestressedPercent:0.15,chloridePrestressedPercent:0.06},
};

export const ACI_318_25_AIR: Array<{nominalMaxMm:number;F1:number;F2F3:number}> = [
  {nominalMaxMm:9.5,F1:6.0,F2F3:7.5},
  {nominalMaxMm:12.5,F1:5.5,F2F3:7.0},
  {nominalMaxMm:19,F1:5.0,F2F3:6.0},
  {nominalMaxMm:25,F1:4.5,F2F3:6.0},
  {nominalMaxMm:37.5,F1:4.5,F2F3:5.5},
  {nominalMaxMm:50,F1:4.0,F2F3:5.0},
  {nominalMaxMm:75,F1:3.5,F2F3:4.5},
];

export const ACI_318_25_META = {
  code:'ACI CODE-318-25',
  chapter:'19',
  tables:['19.3.1.1','19.3.2.1','19.3.3.1'],
  edition:2025,
  source:'American Concrete Institute',
} as const;
