// File: src/utils/telesaleColors.js

const DEFAULT_COLOR = '#64748B';

/**
 * Kiểm tra HEX 6 ký tự.
 */
export const normalizeTelesaleColor = (value) => {
  const color = String(value || '').trim();

  return /^#[0-9A-Fa-f]{6}$/.test(color)
    ? color.toUpperCase()
    : DEFAULT_COLOR;
};

/**
 * HEX -> RGB
 */
const hexToRgb = (hex) => {
  const normalized = normalizeTelesaleColor(hex);

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

/**
 * Tính relative luminance theo WCAG.
 */
const getRelativeLuminance = ({ r, g, b }) => {
  const values = [r, g, b].map((value) => {
    const channel = value / 255;

    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return (
    0.2126 * values[0] +
    0.7152 * values[1] +
    0.0722 * values[2]
  );
};

/**
 * Contrast ratio giữa 2 màu.
 */
const getContrastRatio = (color1, color2) => {
  const luminance1 = getRelativeLuminance(hexToRgb(color1));
  const luminance2 = getRelativeLuminance(hexToRgb(color2));

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Chọn màu chữ có độ tương phản tốt.
 *
 * Nếu màu telesale đủ tối để dùng trực tiếp trên nền trắng
 * thì giữ nguyên màu telesale.
 *
 * Nếu màu quá sáng như vàng, vàng chanh, xanh neon...
 * thì dùng màu chữ tối.
 */
export const getTelesaleTextColor = (color) => {
  const normalized = normalizeTelesaleColor(color);

  const darkText = '#334155';

  // Nếu màu gốc đủ tương phản với nền trắng,
  // có thể dùng chính màu đó làm chữ.
  const originalContrast = getContrastRatio(
    normalized,
    '#FFFFFF'
  );

  if (originalContrast >= 4.5) {
    return normalized;
  }

  // Với màu sáng, dùng slate đậm.
  return darkText;
};

/**
 * Trả về toàn bộ style dùng để hiển thị telesale.
 *
 * original:
 *   Màu người dùng chọn.
 *
 * background:
 *   Nền rất nhạt.
 *
 * border:
 *   Viền nhẹ.
 *
 * text:
 *   Màu chữ tự động đảm bảo dễ đọc.
 */
export const getTelesaleColorStyle = (color) => {
  const normalized = normalizeTelesaleColor(color);
  const textColor = getTelesaleTextColor(normalized);

  return {
    color: textColor,
    backgroundColor: `${normalized}18`,
    borderColor: `${normalized}55`,
  };
};

/**
 * Style cho dấu chấm màu nhận diện.
 */
export const getTelesaleDotStyle = (color) => {
  const normalized = normalizeTelesaleColor(color);

  return {
    backgroundColor: normalized,
  };
};

/**
 * Style cho vòng màu ở trang quản lý telesale.
 */
export const getTelesaleSwatchStyle = (color) => {
  const normalized = normalizeTelesaleColor(color);

  return {
    backgroundColor: `${normalized}18`,
    borderColor: `${normalized}55`,
  };
};

/**
 * Export default để tiện sử dụng nếu cần.
 */
export default {
  normalizeTelesaleColor,
  getTelesaleTextColor,
  getTelesaleColorStyle,
  getTelesaleDotStyle,
  getTelesaleSwatchStyle,
};