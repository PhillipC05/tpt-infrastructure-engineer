import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  navigation: {
    dashboard: 'Dashboard',
    projects: 'Projects',
    drawings: 'Drawings',
    estimates: 'Cost Estimator',
    schedule: 'Schedule',
    materials: 'Materials',
    reports: 'Reports',
    procurement: 'Procurement',
    settings: 'Settings',
    feasibility: 'Feasibility',
    viewer3d: '3D Viewer',
  },
  common: {
    loading: 'Loading…',
    error: 'Something went wrong',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    noData: 'No data',
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
