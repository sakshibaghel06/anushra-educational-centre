export type NavigationLink = {
  label: string;
  to: string;
};

export type NewsItem = {
  category: string;
  date: string;
  description: string;
  image: string;
  title: string;
};

export const navigationLinks: NavigationLink[] = [
  { label: "Home", to: "/" },
  { label: "About us", to: "/about" },
  { label: "Academics", to: "/academics" },
  { label: "Admissions", to: "/admissions" },
  { label: "Faculty", to: "/faculty" },
  { label: "Gallery", to: "/gallery" },
  { label: "News & events", to: "/news" },
  { label: "Contact", to: "/contact" },
];

export const newsItems: NewsItem[] = [
  {
    category: "Learning",
    date: "Sample story",
    description:
      "A sample glimpse of hands-on activities that can bring big ideas to life.",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=85",
    title: "Making room for curious minds",
  },
  {
    category: "Community",
    date: "Sample story",
    description:
      "An illustrative story slot for the moments and milestones the school wants to share.",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=85",
    title: "Growing together, every day",
  },
  {
    category: "Events",
    date: "Date to be confirmed",
    description:
      "Event details will be shared here once the school calendar is confirmed.",
    image:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=85",
    title: "A place for every bright idea",
  },
];

export const galleryImages = [
  {
    alt: "Illustrative classroom with students learning together",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=85",
    label: "Learning together",
  },
  {
    alt: "Illustrative student writing in a notebook",
    image:
      "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=900&q=85",
    label: "Curiosity in action",
  },
  {
    alt: "Illustrative group of students in a classroom",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=85",
    label: "A shared journey",
  },
  {
    alt: "Illustrative school building exterior",
    image:
      "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=85",
    label: "A place to grow",
  },
  {
    alt: "Illustrative child reading a book",
    image:
      "https://images.unsplash.com/photo-1485546784815-e380f3297414?auto=format&fit=crop&w=900&q=85",
    label: "Stories open doors",
  },
  {
    alt: "Illustrative students sharing a learning moment",
    image:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=85",
    label: "Learning by doing",
  },
];

export const verifiedContact = {
  address: "School address to be confirmed",
  email: "School email to be confirmed",
  hours: "Office hours to be confirmed",
  phone: "School phone number to be confirmed",
};
