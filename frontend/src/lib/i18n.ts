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

// Te Reo Māori translations
const mi = {
  navigation: {
    dashboard: 'Papatohu',
    projects: 'Kaupapa',
    drawings: 'Tuhinga',
    estimates: 'Tatau Utu',
    schedule: 'Hōtaka',
    materials: 'Rauemi',
    reports: 'Pūrongo',
    procurement: 'Hoko',
    settings: 'Tautuhinga',
    feasibility: 'Āheinga',
    viewer3d: 'Tirohanga 3D',
  },
  common: {
    loading: 'E tukituki ana…',
    error: 'He hapa kei roto',
    save: 'Tiaki',
    cancel: 'Whakakore',
    delete: 'Muku',
    edit: 'Whakatika',
    create: 'Waihanga',
    search: 'Rapu',
    noData: 'Kāore he raraunga',
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      mi: { translation: mi },
    },
    lng: localStorage.getItem('tpt_lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
