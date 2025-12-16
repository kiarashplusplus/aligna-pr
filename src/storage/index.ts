/**
 * Storage module exports
 */

export { ProspectDatabase, getDatabase, closeDatabase } from './database';
export {
  exportToJson,
  exportToCsv,
  exportEmailDrafts,
  exportAll,
  generateSummaryReport,
  generateDashboard,
} from './export';
