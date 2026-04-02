import type { ThemeConfig } from "antd";

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: "#8a4b2a",
    colorLink: "#8a4b2a",
    colorText: "#2f241d",
    colorTextSecondary: "#6f6258",
    colorBgLayout: "#f6f0e7",
    colorBgContainer: "#fffaf4",
    colorBorder: "#d8c8b7",
    colorSplit: "#e7dbce",
    borderRadius: 18,
    borderRadiusLG: 24,
    fontFamily: "Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif",
    fontFamilyCode: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
    boxShadowTertiary: "0 18px 40px rgba(73, 52, 39, 0.08)",
  },
  components: {
    Button: {
      borderRadius: 999,
      controlHeightLG: 46,
      fontWeight: 600,
    },
    Card: {
      borderRadiusLG: 24,
    },
    Input: {
      controlHeightLG: 46,
    },
    Menu: {
      activeBarBorderWidth: 0,
      horizontalItemBorderRadius: 999,
      itemBorderRadius: 999,
      itemBg: "transparent",
      itemSelectedBg: "rgba(138, 75, 42, 0.12)",
      itemSelectedColor: "#5f3017",
      itemColor: "#5b4a3f",
      itemHoverColor: "#2f241d",
    },
    Select: {
      controlHeightLG: 46,
    },
    Typography: {
      titleMarginBottom: 0.4,
      titleMarginTop: 0,
    },
  },
};
