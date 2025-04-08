// src/constants/sidebarConfig.js

export const SIDEBAR_MODULES = [
  {
    key: 'candidates',
    label: 'Candidate Management',
    icon: require('../assets/hr-management.png'),
    roles: ['Recruiter', 'Manager', 'Admin'],
    route: '/candidates',
    order: 2
  },
  {
    key: 'resume',
    label: 'Resume Optimization',
    icon: require('../assets/choice.png'),
    roles: ['Recruiter'],
    route: '/resume-optimization',
    order: 3
  },
  {
    key: 'training',
    label: 'Training',
    icon: require('../assets/training.png'),
    roles: ['Recruiter', 'Manager'],
    route: '/training',
    order: 1
  },
  {
    key: 'courses',
    label: 'Create course and assessments',
    icon: require('../assets/course.png'),
    roles: ['Trainer'],
    route: '/courses-assessments',
    order: 4
  },
  {
    key: 'simulations',
    label: 'Simulaciones',
    icon: require('../assets/simulation.png'),
    roles: ['Recruiter'],
    route: '/simulations',
    order: 5
  },
  {
    key: 'reports',
    label: 'Reportes',
    icon: require('../assets/reports.png'),
    roles: ['Admin', 'Manager'],
    route: '/reports',
    order: 6
  },
  {
    key: 'settings',
    label: 'Configuración',
    icon: require('../assets/settings.png'),
    roles: ['Admin'],
    route: '/settings',
    order: 7
  },

  {
    key: 'results',
    label: 'Evaluation results',
    icon: require('../assets/result.png'),
    roles: ['Trainer'],
    route: '/results',
    order: 7
  }
];
