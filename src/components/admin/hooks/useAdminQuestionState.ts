import { useState, useEffect, useMemo } from 'react';
import { BaseQuestion, CognitiveCategory, DifficultyLevel, ALL_COGNITIVE_CATEGORIES, COGNITIVE_CATEGORY_LABELS } from '../../../types';
import { questionBankService } from '../../../services/question-bank-service';
import { CATEGORY_COLORS } from '../constants';
import { sound } from '../../../lib/sound';

export function useAdminQuestionState() {
  const [questions, setQuestions] = useState<BaseQuestion[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | 4 | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CognitiveCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<
    'default' | 'difficulty_asc' | 'difficulty_desc' | 'grade_asc' | 'grade_desc' | 'prompt_asc'
  >('default');

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Notifications
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const refreshQuestions = () => {
    const list = questionBankService.getFiltered({
      grade: selectedGrade,
      category: selectedCategory,
      difficulty: selectedDifficulty,
      search: searchQuery,
    });
    setQuestions(list);
  };

  useEffect(() => {
    refreshQuestions();
  }, [selectedGrade, selectedCategory, selectedDifficulty, searchQuery]);

  useEffect(() => {
    const unsubscribe = questionBankService.subscribe(() => {
      refreshQuestions();
    });
    return unsubscribe;
  }, [selectedGrade, selectedCategory, selectedDifficulty, searchQuery]);

  const stats = useMemo(() => {
    return questionBankService.getStats();
  }, [questions]);

  const categoryDistribution = useMemo(() => {
    const total = questions.length;
    if (total === 0) return [];
    const counts: Record<string, number> = {};
    questions.forEach((q) => {
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    return ALL_COGNITIVE_CATEGORIES.map((cat) => ({
      category: cat,
      label: COGNITIVE_CATEGORY_LABELS[cat],
      count: counts[cat] || 0,
      pct: Math.round(((counts[cat] || 0) / total) * 100),
      color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.visual_perception,
    })).filter((c) => c.count > 0);
  }, [questions]);

  const displayQuestions = useMemo(() => {
    let list = [...questions];
    if (sortBy === 'difficulty_asc') {
      list.sort((a, b) => a.difficulty - b.difficulty);
    } else if (sortBy === 'difficulty_desc') {
      list.sort((a, b) => b.difficulty - a.difficulty);
    } else if (sortBy === 'grade_asc') {
      list.sort((a, b) => (a.targetGrade || 1) - (b.targetGrade || 1));
    } else if (sortBy === 'grade_desc') {
      list.sort((a, b) => (b.targetGrade || 1) - (a.targetGrade || 1));
    } else if (sortBy === 'prompt_asc') {
      list.sort((a, b) => a.prompt.localeCompare(b.prompt, 'tr'));
    }
    return list;
  }, [questions, sortBy]);

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    sound.playClick();
    if (selectedQuestionIds.size === displayQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(displayQuestions.map((q) => q.id)));
    }
  };

  const handleBatchDelete = () => {
    sound.playClick();
    if (selectedQuestionIds.size === 0) return;
    if (window.confirm(`Seçilen ${selectedQuestionIds.size} soruyu silmek istediğinize emin misiniz?`)) {
      selectedQuestionIds.forEach((id) => {
        questionBankService.deleteQuestion(id);
      });
      showNotification(`${selectedQuestionIds.size} soru havuzdan başarıyla silindi.`);
      setSelectedQuestionIds(new Set());
      refreshQuestions();
    }
  };

  const handleBatchDuplicate = (targetGrade: 1 | 2 | 3 | 4) => {
    sound.playClick();
    if (selectedQuestionIds.size === 0) return;
    selectedQuestionIds.forEach((id) => {
      questionBankService.duplicateQuestion(id, targetGrade);
    });
    showNotification(`${selectedQuestionIds.size} soru ${targetGrade}. Sınıf havuzuna kopyalandı.`);
    setSelectedQuestionIds(new Set());
    refreshQuestions();
  };

  const handleBatchExport = () => {
    sound.playClick();
    if (selectedQuestionIds.size === 0) return;
    const selectedQuestions = questions.filter((q) => selectedQuestionIds.has(q.id));
    const jsonStr = JSON.stringify(selectedQuestions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secilen_${selectedQuestions.length}_soru_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`${selectedQuestions.length} soru JSON dosyası olarak indirildi.`);
  };

  const handleClearFilters = () => {
    sound.playClick();
    setSelectedGrade('all');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setSearchQuery('');
    setSortBy('default');
  };

  const handleDelete = (id: string, promptTitle: string) => {
    sound.playClick();
    if (window.confirm(`"${promptTitle}" sorusunu havuzdan silmek istediğinize emin misiniz?`)) {
      const ok = questionBankService.deleteQuestion(id);
      if (ok) {
        showNotification('Soru başarıyla havuzdan kaldırıldı.');
        refreshQuestions();
      }
    }
  };

  const handleDuplicate = (id: string, targetGrade: 1 | 2 | 3 | 4) => {
    sound.playClick();
    const cloned = questionBankService.duplicateQuestion(id, targetGrade);
    if (cloned) {
      showNotification(`Soru başarıyla ${targetGrade}. Sınıf havuzuna kopyalandı.`);
      refreshQuestions();
    }
  };

  const handleExportJSON = () => {
    sound.playClick();
    const jsonStr = questionBankService.exportQuestionsJson(selectedGrade);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilsem_soru_havuzu_${selectedGrade === 'all' ? 'tum_siniflar' : `${selectedGrade}_sinif`}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Soru havuzu JSON dosyası olarak indirildi.');
  };

  const handleResetDefaults = () => {
    sound.playClick();
    if (window.confirm('Tüm özel sorular sıfırlanıp varsayılan BİLSEM soru havuzuna dönülsün mü?')) {
      questionBankService.resetToDefaults();
      refreshQuestions();
      showNotification('Soru havuzu varsayılan BİLSEM standartlarına sıfırlandı.', 'info');
    }
  };

  return {
    questions,
    selectedGrade, setSelectedGrade,
    selectedCategory, setSelectedCategory,
    selectedDifficulty, setSelectedDifficulty,
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    sortBy, setSortBy,
    selectedQuestionIds, setSelectedQuestionIds,
    notification, showNotification,
    stats, categoryDistribution, displayQuestions,
    refreshQuestions,
    toggleSelectQuestion, handleSelectAllVisible,
    handleBatchDelete, handleBatchDuplicate, handleBatchExport,
    handleClearFilters, handleDelete, handleDuplicate,
    handleExportJSON, handleResetDefaults,
    hasActiveFilters: selectedGrade !== 'all' || selectedCategory !== 'all' || selectedDifficulty !== 'all' || searchQuery.trim().length > 0 || sortBy !== 'default'
  };
}
