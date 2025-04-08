// src/constants/sidebarConfig.js

export const SIDEBAR_MODULES = [
    {
      key: 'training',
      label: 'Training',
      icon: require('../assets/training.png'),
      roles: ['Trainer', 'Admin'],
      route: '/training'
    },
    {
      key: 'candidates',
      label: 'Candidate Management',
      icon: require('../assets/hr-management.png'),
      roles: ['Recruiter', 'Manager', 'Admin'],
      route: '/candidates'
    },
    {
      key: 'resume',
      label: 'Resume Optimization',
      icon: require('../assets/choice.png'),
      roles: ['Recruiter'],
      route: '/resume-optimization'
    },
    {
      key: 'courses',
      label: 'Crear Cursos',
      icon: require('../assets/course.png'),
      roles: ['Trainer'],
      route: '/trainer/courses'
    },
    {
      key: 'simulations',
      label: 'Simulaciones',
      icon: require('../assets/simulation.png'),
      roles: ['Trainer'],
      route: '/trainer/simulations'
    },
    {
      key: 'reports',
      label: 'Reportes',
      icon: require('../assets/reports.png'),
      roles: ['Admin', 'Manager'],
      route: '/reports'
    },
    {
      key: 'settings',
      label: 'Configuración',
      icon: require('../assets/settings.png'),
      roles: ['Admin'],
      route: '/settings'
    }
  ];
  