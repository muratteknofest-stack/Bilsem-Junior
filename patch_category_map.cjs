const fs = require('fs');
let indexContent = fs.readFileSync('src/features/questions/generators/index.ts', 'utf8');

indexContent = indexContent.replace(
  "numerical: ['number_pattern', 'shape_counting', 'shape_equation', 'operation_machine', 'number_pyramid', 'weight_comparison'],",
  "numerical: ['number_pattern', 'shape_counting', 'shape_equation', 'operation_machine', 'number_pyramid', 'weight_comparison'],\n  verbal: ['verbal_analogy', 'word_scramble_logic', 'classification'],\n  coding: ['symbol_coding', 'cryptogram', 'logical_sequence', 'maze_path'],"
);

fs.writeFileSync('src/features/questions/generators/index.ts', indexContent);
