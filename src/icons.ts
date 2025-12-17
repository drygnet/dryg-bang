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
    route: "/icons/jira.svg",
    url: "https://www.atlassian.com/software/jira"
  },
  {
    id: 2,
    title: "Confluence",
    category: "Software",
    route: "/icons/confluence.svg",
    url: "https://www.atlassian.com/software/confluence"
  }
];
