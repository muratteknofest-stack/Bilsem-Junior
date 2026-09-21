import React from 'react';
import { BaseQuestion } from '../../../types';
import { ProfessionalBoard } from './ProfessionalBoard';
import { MatrixRenderer } from './engines/MatrixRenderer';
import { ScaleRenderer } from './engines/ScaleRenderer';
import { CubeRenderer } from './engines/CubeRenderer';
import { MechanicsRenderer } from './engines/MechanicsRenderer';
import { PaperFoldRenderer } from './engines/PaperFoldRenderer';
import { LogicGridRenderer } from './engines/LogicGridRenderer';
import { GenericRenderer } from './engines/GenericRenderer';
import type { Board } from '../professional-engine';

interface QuestionRendererProps {
  question: BaseQuestion;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({ question }) => {
  const { visualConfig } = question;
  const mode = visualConfig?.displayMode || 'default';
  
  const renderEngine = () => {
    if (mode === 'verified_board') return <ProfessionalBoard board={visualConfig as Board} />;

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
    <div className="w-full max-w-[560px] mx-auto overflow-hidden flex items-center justify-center p-1 sm:p-3 select-none touch-manipulation">
      {renderEngine()}
    </div>
  );
};
