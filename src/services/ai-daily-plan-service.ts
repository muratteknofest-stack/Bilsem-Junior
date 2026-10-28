import { dataService } from './data-service';
import { LocalStudyPlanService } from './local-study-plan-service';

export const aiDailyPlanService = new LocalStudyPlanService(dataService);
