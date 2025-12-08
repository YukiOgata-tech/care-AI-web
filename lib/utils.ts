import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Tailwind CSSクラス名をマージするユーティリティ
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ファイルサイズをフォーマット
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 相対的な時間表示
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'たった今';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}時間前`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}日前`;
  } else {
    return dateObj.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

// 日付を日本語フォーマット
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 時刻を含む日付フォーマット
export function formatDateTime(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// カテゴリを日本語に変換
export function getCategoryLabel(
  category: string
): string {
  const labels: Record<string, string> = {
    emergency: '緊急時対応',
    medication: '薬剤情報',
    care_plan: 'ケアプラン',
    doctor_order: '医師指示書',
    manual: 'マニュアル',
    other: 'その他',
  };

  return labels[category] || category;
}

// カテゴリの色を取得
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    emergency: 'bg-red-100 text-red-800 border-red-200',
    medication: 'bg-blue-100 text-blue-800 border-blue-200',
    care_plan: 'bg-green-100 text-green-800 border-green-200',
    doctor_order: 'bg-purple-100 text-purple-800 border-purple-200',
    manual: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return colors[category] || colors.other;
}
