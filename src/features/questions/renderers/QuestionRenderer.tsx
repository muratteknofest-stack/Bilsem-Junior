import {SymbolicBoard} from './SymbolicBoard';
import { ColorfulBoard } from './ColorfulBoard';
import type { ColorfulBoard as ColorfulBoardData } from '../colorful-engine';
import React from 'react';
import {SpatialPresentation} from './spatial-presentation';
import { BaseQuestion } from '../../../types';
import type { Board } from '../professional-engine';
import { ProfessionalBoard } from './ProfessionalBoard';
import { MatrixRenderer } from './engines/MatrixRenderer';
import { ScaleRenderer } from './engines/ScaleRenderer';
import { CubeRenderer } from './engines/CubeRenderer';
import { MechanicsRenderer } from './engines/MechanicsRenderer';
import { PaperFoldRenderer } from './engines/PaperFoldRenderer';
import { LogicGridRenderer } from './engines/LogicGridRenderer';
import { GenericRenderer } from './engines/GenericRenderer';
import { questionVisualTheme } from '../visual-vocabulary';
import { WorkshopBoard } from './WorkshopBoard';
import type { WorkshopBoard as WorkshopBoardData } from '../workshop-mechanics';
import { useMemoryStudy } from './MemoryStudy';
import { CompleteBoard } from './CompleteBoard';

interface QuestionRendererProps {
  question: BaseQuestion;
  previewMethod?: 'svg'|'webgl';
  previewPerspective?:boolean;
  spatialControls?:boolean;
  hideContext?:boolean;
  onSpatialUnavailable?:()=>void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({ question,previewMethod='svg',previewPerspective=false,spatialControls=true,onSpatialUnavailable,hideContext=false }) => {
  const memory=useMemoryStudy();
  const visualConfig = (question.visualConfig || {}) as Record<string, unknown>;
  const mode = typeof visualConfig.displayMode === 'string' ? visualConfig.displayMode : 'default';
  
  const renderEngine = () => {
    if(mode==='symbolic_v2')return <SymbolicBoard board={visualConfig as unknown as import('../symbolic-v2').SymbolicBoard}/>;
    if(mode==='curriculum_board')return <CompleteBoard board={visualConfig as unknown as import('../complete-curriculum').CompleteBoard}/>;
    if(mode==='colorful_board')return memory.hidden&&question.type==='visual_memory'?<p role="status">Desen gizlendi. Belleğindeki deseni seç.</p>:<ColorfulBoard board={visualConfig as unknown as ColorfulBoardData}/>;
    if (mode === 'workshop_board') return memory.hidden&&question.type==='visual_memory'?<p role="status" className="rounded-2xl border border-indigo-200 p-6 text-indigo-900">Desen gizlendi. Belleğinde tuttuğun deseni seçeneklerden seç.</p>:<WorkshopBoard board={visualConfig as unknown as WorkshopBoardData} />;
    if (mode === 'verified_board') return <ProfessionalBoard board={visualConfig as Board} theme={questionVisualTheme(question)} />;

    if (['matrix_2x2', 'matrix_3x3', 'raven_matrix', 'shape_grid'].includes(mode)) {
      return <MatrixRenderer question={question} mode={mode} />;
    }

    if (['balance_scale', 'weight_comparison', 'liquid_levels'].includes(mode)) {
      return <ScaleRenderer question={question} mode={mode} />;
    }

    if (['cube_stack', 'dice_net', 'multiview_perspective', 'spatial_origami', '3d_stack'].includes(mode)) {
      return <CubeRenderer question={question} mode={mode} />;
    }

    if (['gear_system', 'operation_machine'].includes(mode)) {
      return <MechanicsRenderer question={question} mode={mode} />;
    }

    if (['paper_folding', 'punch_folding'].includes(mode)) {
      return <PaperFoldRenderer question={question} mode={mode} />;
    }

    if (['logic_grid', 'symbol_code_table', 'cryptogram', 'word_scramble_logic', 'maze_path', 'grid_path', 'sequence', 'number_sequence_cards', 'number_pyramid'].includes(mode)) {
      return <LogicGridRenderer question={question} mode={mode} />;
    }

    return <GenericRenderer question={question} mode={mode} />;
  };

  return (
    <SpatialPresentation.Provider value={{method:previewMethod,perspective:previewPerspective,controls:spatialControls,onUnavailable:onSpatialUnavailable}}><div className="zp-question-visual w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex items-center justify-center p-0.5 sm:p-2 md:p-3 select-none touch-manipulation">
      <div className="w-full min-w-0 flex flex-col items-center justify-center gap-2">
        {!hideContext&&question.context&&<aside className="w-full rounded-xl bg-indigo-50 px-3 py-2 text-center text-indigo-950"><strong className="block text-sm">{question.context.title}</strong><p className="text-xs leading-relaxed">{question.context.story}</p></aside>}
        {renderEngine()}
      </div>
    </div></SpatialPresentation.Provider>
  );
};



