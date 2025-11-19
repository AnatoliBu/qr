const common = {
  require: ['specs/step_definitions/**/*.ts', 'specs/support/**/*.ts'],
  requireModule: ['ts-node/register'],
  format: [
    'progress-bar',
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-report.json',
    '@cucumber/html-formatter:reports/cucumber-detailed.html'
  ],
  formatOptions: {
    snippetInterface: 'async-await'
  },
  publishQuiet: true,
  dryRun: false,
  failFast: false
};

module.exports = {
  default: {
    ...common,
    paths: ['specs/features/**/*.feature'],
    parallel: 2
  },
  smoke: {
    ...common,
    paths: ['specs/features/**/*.feature'],
    tags: '@smoke'
  },
  critical: {
    ...common,
    paths: ['specs/features/**/*.feature'],
    tags: '@critical'
  },
  wip: {
    ...common,
    paths: ['specs/features/**/*.feature'],
    tags: '@wip',
    failFast: true
  }
};
