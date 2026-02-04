import { BranchConfig, IceCreamItem } from './types';

export const BRANCHES: BranchConfig[] = [
  { name: 'Vincom Bà Triệu', shifts: 2, hasStorageFridge: true },
  { name: 'Aeon Hà Đông', shifts: 2, hasStorageFridge: true },
  { name: 'Vincom Thảo Điền', shifts: 3, hasStorageFridge: true },
  { name: 'Vincom Phan Văn Trị', shifts: 3, hasStorageFridge: false }, // Note: Prompt says "only 1 display fridge"
  { name: 'Vincom Landmark 81', shifts: 3, hasStorageFridge: true },
  { name: 'Gigamall Thủ Đức', shifts: 3, hasStorageFridge: true },
  { name: 'Baby Boss Dĩ An', shifts: 3, hasStorageFridge: false }, // Note: Prompt says "only 1 display fridge"
];

export const ICE_CREAM_FLAVORS: string[] = [
  "Kem Bơ", "Kem Bubble gum", "Kem Cà phê", "Kem Chocolate cookie", "Kem Cốm",
  "Kem Đào", "Kem Dâu tằm", "Kem Dâu tây", "Kem Dừa", "Kem Dừa lưới",
  "Kem Khoai môn", "Kem Kiwi", "Kem Măng cầu", "Kem Mè đen", "Kem Nhãn",
  "Kem Ổi hồng", "Kem Rum nho", "Kem Sầu riêng", "Kem Socola",
  "Kem Sữa chua phô mai", "Kem Trà sữa", "Kem Trà xanh", "Kem Vải",
  "Kem Vani", "Kem Việt quất", "Kem Xoài", "Kem Bạc hà chip",
  "Kem Ngân hà", "Kem Sorbet Chanh bạc hà", "Kem Sorbet Chanh dây",
  "Kem Sorbet Dứa mật"
];

export const isLastShift = (branchName: string, shift: number): boolean => {
  const branch = BRANCHES.find(b => b.name === branchName);
  if (!branch) return false;
  return shift === branch.shifts;
};

export const hasStorageFridgeInput = (branchName: string): boolean => {
  const branch = BRANCHES.find(b => b.name === branchName);
  return branch ? branch.hasStorageFridge : true;
};
