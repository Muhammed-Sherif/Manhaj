import { useState } from 'react';
import { usePostAdminQuestions } from '@manhaj/api-client';
import { X, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { axios } from '@/api/client';

type EditableChoice = {
  choiceText: string;
  isCorrect: boolean;
};

export function AddQuestionModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [questionType, setQuestionType] = useState<'mcq' | 'written'>('mcq');
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [answerImageFile, setAnswerImageFile] = useState<File | null>(null);
  const [telegramMessageId, setTelegramMessageId] = useState<string>('');
  const [choices, setChoices] = useState<EditableChoice[]>([
    { choiceText: '', isCorrect: true },
    { choiceText: '', isCorrect: false },
  ]);

  const createMutation = usePostAdminQuestions({
    mutation: {
      onSuccess: () => {
        toast.success('Question created successfully');
        onSaved();
        onClose();
      },
      onError: () => toast.error('Failed to create question'),
    },
  });

  const handleChoiceChange = (index: number, field: 'choiceText' | 'isCorrect', value: string | boolean) => {
    setChoices((prev) =>
      prev.map((c, i) => {
        if (i !== index) {
          if (field === 'isCorrect' && value === true) return { ...c, isCorrect: false };
          return c;
        }
        return { ...c, [field]: value };
      })
    );
  };

  const addChoice = () =>
    setChoices((prev) => [...prev, { choiceText: '', isCorrect: false }]);

  const removeChoice = (index: number) =>
    setChoices((prev) => prev.filter((_, i) => i !== index));

  const uploadImage = async (file: File, label: string): Promise<string | null> => {
    try {
      const res = await axios.post('/admin/questions/upload-image', file, {
        headers: { 'Content-Type': file.type },
      });
      console.log(`[AddQuestion] ${label} image uploaded:`, res.data);
      return res.data.imageUrl as string;
    } catch (err: any) {
      console.error(`[AddQuestion] ${label} image upload failed:`, err?.response?.data ?? err);
      toast.error(`Failed to upload ${label} image`);
      return null;
    }
  };

  const handleSubmit = async () => {
    const isWritten = questionType === 'written';
    let imageUrl: string | undefined = undefined;
    let answerImageUrl: string | undefined = undefined;

    if (imageFile) {
      const url = await uploadImage(imageFile, 'question');
      if (!url) return;
      imageUrl = url;
    }

    if (answerImageFile) {
      const url = await uploadImage(answerImageFile, 'answer');
      if (!url) return;
      answerImageUrl = url;
    }

    createMutation.mutate({
      data: {
        questionText,
        explanation,
        questionType,
        source: 'admin_manual',
        imageUrl,
        answerImageUrl,
        telegramMessageId: telegramMessageId ? parseInt(telegramMessageId, 10) : undefined,
        ...(isWritten ? { writtenAnswer } : { choices }),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add Manual Question</h2>
            <p className="text-sm text-slate-500 mt-0.5">Create a new question directly</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${questionType === 'mcq' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setQuestionType('mcq')}
              >
                Multiple Choice
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${questionType === 'written' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setQuestionType('written')}
              >
                Written Answer
              </button>
            </div>
          </div>

          {/* Question text */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question text</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              rows={4}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter question text…"
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Explanation <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Enter explanation…"
            />
          </div>

          {/* Telegram Message ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Message ID <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={telegramMessageId}
              onChange={(e) => setTelegramMessageId(e.target.value)}
              placeholder="e.g. 12345"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
            {imageFile && (
              <p className="mt-2 text-xs text-slate-500 truncate">Selected: {imageFile.name}</p>
            )}
          </div>

          {/* Answer Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Answer image <span className="text-slate-400 font-normal">(optional, shown when the answer is revealed)</span></label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAnswerImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
            {answerImageFile && (
              <p className="mt-2 text-xs text-slate-500 truncate">Selected: {answerImageFile.name}</p>
            )}
          </div>

          {/* Written Answer / Choices */}
          {questionType === 'written' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Model answer <span className="text-slate-400 font-normal">(spoiler text)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-violet-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                rows={5}
                value={writtenAnswer}
                onChange={(e) => setWrittenAnswer(e.target.value)}
                placeholder="Enter model answer…"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Choices</label>
                <button
                  onClick={addChoice}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  <Plus size={13} /> Add choice
                </button>
              </div>
              {choices.length === 0 && (
                <p className="text-xs text-slate-400 italic">No choices yet. Click "Add choice" to add one.</p>
              )}
              <div className="space-y-2">
                {choices.map((choice, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${choice.isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
                      }`}
                  >
                    <button
                      type="button"
                      title={choice.isCorrect ? 'Correct answer' : 'Mark as correct'}
                      onClick={() => handleChoiceChange(i, 'isCorrect', !choice.isCorrect)}
                      className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ${choice.isCorrect
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 hover:border-emerald-400'
                        }`}
                    >
                      {choice.isCorrect && <Check size={12} strokeWidth={3} />}
                    </button>
                    <input
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                      value={choice.choiceText}
                      onChange={(e) => handleChoiceChange(i, 'choiceText', e.target.value)}
                    />
                    <button
                      onClick={() => removeChoice(i)}
                      className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="Remove choice"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4 shrink-0">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!questionText.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving…' : 'Create question'}
          </Button>
        </div>
      </div>
    </div>
  );
}
