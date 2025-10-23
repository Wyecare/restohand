import { FloorPlanData } from '../types';

export const exportFloorPlan = (data: FloorPlanData): void => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `floor-plan-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importFloorPlan = (file: File): Promise<FloorPlanData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
