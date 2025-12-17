// Hardcoded icons for quick selection
// Format matches svgl.app API response structure

export interface LocalIcon {
  id: number;
  title: string;
  category: string;
  route: string | { light: string; dark: string };
  url?: string;
}

export const localIcons: LocalIcon[] = [
  {
    id: 1,
    title: "Jira",
    category: "Software",
    route: "/icons/jira-1.svg",
    url: "https://www.atlassian.com/software/jira"
  },
  {
    id: 2,
    title: "Confluence",
    category: "Software",
    route: "/icons/confluence-1.svg",
    url: "https://www.atlassian.com/software/confluence"
  },
    {
      id: 3,
      title: "Gmail",
      category: "Software",
      route: "/icons/gmail-icon.svg",
      url: "https://mail.google.com"
    },
    {
        id: 4,
        title: "Google Maps",
        category: "Software",
        route: "/icons/google-maps-2020-icon.svg",
        url: "https://maps.google.com"
    }
];