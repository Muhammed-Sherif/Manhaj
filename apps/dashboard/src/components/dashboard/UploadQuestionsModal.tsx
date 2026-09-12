import React, { useState } from 'react';
import { X, Plus, Trash2, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { axios } from '@/api/client';

interface ChoiceForm {
  choiceText: string;
  isCorrect: boolean;
}

interface UploadQuestionsModalProps {
  open: boolean;
  onClose: () => void;
  onQuestionsAdded: () => void;
}

export function UploadQuestionsModal({
  open,
  onClose,
  onQuestionsAdded,
}: UploadQuestionsModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Form State
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [source, setSource] = useState('manual');
  const [choices, setChoices] = useState<ChoiceForm[]>([
    { choiceText: '', isCorrect: true },
    { choiceText: '', isCorrect: false },
    { choiceText: '', isCorrect: false },
    { choiceText: '', isCorrect: false },
  ]);

  // Bulk Upload State
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  if (!open) return null;

  // Choice handlers
  const handleChoiceTextChange = (index: number, text: string) => {
    setChoices((prev) =>
      prev.map((c, i) => (i === index ? { ...c, choiceText: text } : c))
    );
  };

  const handleSetCorrect = (index: number) => {
    setChoices((prev) =>
      prev.map((c, i) => ({ ...c, isCorrect: i === index }))
    );
  };

  const handleAddChoice = () => {
    setChoices((prev) => [...prev, { choiceText: '', isCorrect: false }]);
  };

  const handleRemoveChoice = (index: number) => {
    if (choices.length <= 2) {
      toast.error('A question must have at least 2 choices');
      return;
    }
    const wasCorrect = choices[index].isCorrect;
    const remaining = choices.filter((_, i) => i !== index);
    if (wasCorrect && remaining.length > 0) {
      remaining[0].isCorrect = true;
    }
    setChoices(remaining);
  };

  // Submit single manual question
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      toast.error('Please enter the question text');
      return;
    }

    const validChoices = choices.filter((c) => c.choiceText.trim().length > 0);
    if (validChoices.length < 2) {
      toast.error('Please provide at least 2 non-empty choices');
      return;
    }

    if (!validChoices.some((c) => c.isCorrect)) {
      toast.error('Please select which choice is the correct answer');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/admin/questions', {
        questionText: questionText.trim(),
        explanation: explanation.trim(),
        source: source || 'manual',
        choices: validChoices,
      });

      toast.success('Question created successfully!');
      onQuestionsAdded();
      // Reset form
      setQuestionText('');
      setExplanation('');
      setChoices([
        { choiceText: '', isCorrect: true },
        { choiceText: '', isCorrect: false },
        { choiceText: '', isCorrect: false },
        { choiceText: '', isCorrect: false },
      ]);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create question');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle JSON File Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setJsonText(text);
        // Test parsing
        const parsed = JSON.parse(text);
        const count = Array.isArray(parsed) ? parsed.length : 1;
        toast.success(`Loaded file with ${count} question(s)`);
      } catch (err) {
        toast.error('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
  };

  // Submit Bulk Questions
  const handleBulkSubmit = async () => {
    if (!jsonText.trim()) {
      toast.error('Please upload a JSON file or paste JSON questions data');
      return;
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (err) {
      toast.error('Invalid JSON. Please ensure your input is valid JSON.');
      return;
    }

    const items = Array.isArray(parsedData) ? parsedData : [parsedData];
    if (items.length === 0) {
      toast.error('No questions found in data');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/admin/questions', items);
      toast.success(`Successfully uploaded ${items.length} question(s)!`);
      onQuestionsAdded();
      setJsonText('');
      setFileName(null);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to import questions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Upload & Add Questions</h2>
            <p className="text-sm text-slate-500">
              Create a question manually or bulk import from JSON
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={16} />
            Manual Question Form
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'bulk'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload size={16} />
            Bulk / JSON Upload
          </button>
        </div>

        {/* Tab 1: Manual Form */}
        {activeTab === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Question Text *
                </label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the question text here..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              {/* Choices */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Choices & Options *
                  </label>
                  <span className="text-xs text-slate-400">
                    Select the radio button for the correct answer
                  </span>
                </div>

                <div className="space-y-2.5">
                  {choices.map((choice, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                        choice.isCorrect
                          ? 'border-teal-500 bg-teal-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correct-choice"
                        checked={choice.isCorrect}
                        onChange={() => handleSetCorrect(index)}
                        className="size-4 accent-teal-600 cursor-pointer"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={choice.choiceText}
                        onChange={(e) => handleChoiceTextChange(index, e.target.value)}
                        placeholder={`Choice ${index + 1}`}
                        className="flex-1 bg-transparent text-sm text-slate-800 focus:outline-none"
                      />
                      {choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChoice(index)}
                          className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                          title="Remove option"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddChoice}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  <Plus size={14} /> Add Another Choice
                </button>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Explanation (Optional)
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain why the correct choice is right..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Source Tag */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Source / Tag
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. manual, past_exam, telegram"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Create Question'}
              </Button>
            </div>
          </form>
        ) : (
          /* Tab 2: Bulk / File Upload */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* File Drop Area */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Select JSON File
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-teal-500 hover:bg-teal-50/20 transition-all">
                  <Upload className="size-8 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-700">
                    {fileName ? fileName : 'Click to select or drag & drop a .json file'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    Accepts questions JSON array format
                  </span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Paste JSON Raw Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-slate-800">
                    Or Paste Questions JSON
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setJsonText(
                        JSON.stringify(
                          [
                            {
                              questionText: 'Which of the following is the normal cardiac pacemaker?',
                              explanation: 'The SA node typically generates spontaneous action potentials at 60-100 bpm.',
                              source: 'manual',
                              choices: [
                                { choiceText: 'SA Node', isCorrect: true },
                                { choiceText: 'AV Node', isCorrect: false },
                                { choiceText: 'Bundle of His', isCorrect: false },
                                { choiceText: 'Purkinje fibers', isCorrect: false },
                              ],
                            },
                          ],
                          null,
                          2
                        )
                      );
                    }}
                    className="text-xs text-teal-600 hover:underline font-medium"
                  >
                    Insert Example JSON Template
                  </button>
                </div>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="[&#10;  {&#10;    &quot;questionText&quot;: &quot;...&quot;,&#10;    &quot;explanation&quot;: &quot;...&quot;,&#10;    &quot;choices&quot;: [&#10;      { &quot;choiceText&quot;: &quot;...&quot;, &quot;isCorrect&quot;: true }&#10;    ]&#10;  }&#10;]"
                  rows={8}
                  className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleBulkSubmit} disabled={isSubmitting || !jsonText.trim()}>
                {isSubmitting ? 'Uploading...' : 'Import Questions'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
