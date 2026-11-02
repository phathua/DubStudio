/**
 * Danh mục cấu hình tối thiểu và thông số vận hành cho toàn bộ 27 mô hình AI của DubStudio.
 * Phân chia theo 4 nhóm chức năng:
 * - ASR & Căn chỉnh mốc thời gian (ASR & Alignment)
 * - Tách giọng nói & Âm thanh (Audio Separation)
 * - Phân biệt người nói, Giới tính & Dịch thuật (Diarization, Gender & MT)
 * - Đọc văn bản (Text-to-Speech & Vocoder)
 */

export type ModelCategory =
  | "asr"
  | "alignment"
  | "separation"
  | "enhancement"
  | "diarization"
  | "gender"
  | "pitch"
  | "tts"
  | "vocoder"
  | "translation";

export interface AIModel {
  id: string;
  name: string;
  architecture: string;
  category: ModelCategory;
  categoryLabel: string;
  ramMinGb: number;
  vramMinGb: number;
  operationalNotes: string;
  verifiedLanguages: string[] | null;
  source?: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: "qwen3-asr",
    name: "Qwen3-ASR (0.6B / 1.7B)",
    architecture: "0.6B / 1.7B",
    category: "asr",
    categoryLabel: "Nhận diện giọng nói (ASR)",
    ramMinGb: 4.0,
    vramMinGb: 0.0,
    operationalNotes: "Hỗ trợ lượng tử hóa GGUF/INT8 chạy trên CPU. VRAM 1.5 GB (0.6B) - 4 GB (1.7B) khi chạy GPU.",
    verifiedLanguages: ["vi", "en", "ko", "zh", "ja"],
    source: "https://github.com/QwenLM/Qwen3-ASR"
  },
  {
    id: "qwen3-aligner",
    name: "Qwen3-ForcedAligner-0.6B",
    architecture: "0.6B",
    category: "alignment",
    categoryLabel: "Căn chỉnh mốc thời gian (Alignment)",
    ramMinGb: 2.0,
    vramMinGb: 0.0,
    operationalNotes: "Chuyên căn chỉnh timestamp từ văn bản. Chạy CPU hoặc GPU ~1.5 GB VRAM.",
    verifiedLanguages: ["en", "ko", "zh", "ja", "fr", "de", "es", "it", "pt", "ru", "yue"],
    source: "https://github.com/QwenLM/Qwen3-ASR"
  },
  {
    id: "whisper",
    name: "OpenAI Whisper (base / small / large)",
    architecture: "base / small / large",
    category: "asr",
    categoryLabel: "Nhận diện giọng nói (ASR)",
    ramMinGb: 2.0,
    vramMinGb: 1.0,
    operationalNotes: "Bản gốc PyTorch rất nặng VRAM ở bản Large (1 GB - 10 GB VRAM, 2 GB - 8 GB RAM).",
    verifiedLanguages: ["vi", "en", "ko", "zh", "ja"],
    source: "https://github.com/openai/whisper"
  },
  {
    id: "faster-whisper",
    name: "Faster-Whisper (base / small / large-v3-turbo INT8)",
    architecture: "base, small, large-v3-turbo (INT8)",
    category: "asr",
    categoryLabel: "Nhận diện giọng nói (ASR)",
    ramMinGb: 2.0,
    vramMinGb: 0.0,
    operationalNotes: "Tối ưu qua CTranslate2, cực nhẹ, chạy CPU rất mượt. GPU cần 0.5 GB - 2.5 GB VRAM.",
    verifiedLanguages: ["vi", "en", "ko", "zh", "ja"],
    source: "https://github.com/SYSTRAN/faster-whisper"
  },
  {
    id: "whisperx",
    name: "WhisperX (large-v3-turbo + Alignment)",
    architecture: "large-v3-turbo + Alignment",
    category: "asr",
    categoryLabel: "Nhận diện giọng nói (ASR)",
    ramMinGb: 6.0,
    vramMinGb: 3.5,
    operationalNotes: "Gộp cả Faster-Whisper + Wav2Vec2 + Pyannote. VRAM yêu cầu 3.5 GB - 4.5 GB.",
    verifiedLanguages: null,
    source: "https://github.com/m-bain/whisperX"
  },
  {
    id: "sherpa-onnx",
    name: "Zipformer & Paraformer (Sherpa-ONNX)",
    architecture: "Zipformer & Paraformer",
    category: "asr",
    categoryLabel: "Nhận diện giọng nói (ASR)",
    ramMinGb: 0.5,
    vramMinGb: 0.0,
    operationalNotes: "Thiết kế cho thiết bị nhúng/on-device siêu nhẹ, 100% thuần CPU (0 GB VRAM, RAM 0.5 GB - 1 GB).",
    verifiedLanguages: null,
    source: "https://github.com/k2-fsa/sherpa-onnx"
  },
  {
    id: "wav2vec2-align",
    name: "Wav2Vec2 Base Alignment",
    architecture: "Base Alignment",
    category: "alignment",
    categoryLabel: "Căn chỉnh mốc thời gian (Alignment)",
    ramMinGb: 2.0,
    vramMinGb: 0.0,
    operationalNotes: "Thường load kèm trong pipeline của WhisperX. GPU cần ~1 GB VRAM.",
    verifiedLanguages: null,
    source: "https://github.com/pytorch/fairseq"
  },
  {
    id: "cohere-transcribe",
    name: "Cohere Transcribe 2B",
    architecture: "2B",
    category: "asr",
    categoryLabel: "Nhận diện giọng nói (ASR)",
    ramMinGb: 8.0,
    vramMinGb: 4.5,
    operationalNotes: "Model kích thước lớn 2 tỷ tham số. Cần 8 GB RAM, 4.5 GB (INT8) - 6 GB (FP16) VRAM.",
    verifiedLanguages: null,
    source: "None"
  },
  {
    id: "bs-roformer",
    name: "RoFormer Series (BS-RoFormer, Mel-Band)",
    architecture: "BS-RoFormer, Mel-Band (Viperx, Kim)",
    category: "separation",
    categoryLabel: "Tách âm & Khử ồn (Audio Separation)",
    ramMinGb: 8.0,
    vramMinGb: 4.0,
    operationalNotes: "Kiến trúc nặng nhất nhóm tách nhạc, cần GPU rời (4 GB - 6 GB VRAM, 8 GB RAM).",
    verifiedLanguages: null,
    source: "https://github.com/lucidrains/BS-RoFormer"
  },
  {
    id: "mdx",
    name: "MDX-Net / MDX23C (Kim_Vocal_2, MDX23C InstVoc HQ)",
    architecture: "Kim_Vocal_2, MDX23C InstVoc HQ",
    category: "separation",
    categoryLabel: "Tách âm & Khử ồn (Audio Separation)",
    ramMinGb: 4.0,
    vramMinGb: 2.0,
    operationalNotes: "Chạy qua ONNX Runtime trong UVR5 (2 GB - 4 GB VRAM, 4 GB - 6 GB RAM).",
    verifiedLanguages: null,
    source: "https://github.com/ZFTurbo/MVSEP-MDX23-music-separation-model"
  },
  {
    id: "demucs",
    name: "Demucs HTDemucs v4 (htdemucs_ft)",
    architecture: "HTDemucs v4 (htdemucs_ft)",
    category: "separation",
    categoryLabel: "Tách âm & Khử ồn (Audio Separation)",
    ramMinGb: 6.0,
    vramMinGb: 0.0,
    operationalNotes: "Nếu tách file dài trên CPU cần tối thiểu 8 GB RAM; GPU cần 3 GB - 4 GB VRAM.",
    verifiedLanguages: null,
    source: "https://github.com/facebookresearch/demucs"
  },
  {
    id: "vr",
    name: "VR Architecture (UVR-DeNoise-Lite, UVR-DeEcho)",
    architecture: "UVR-DeNoise-Lite, UVR-DeEcho",
    category: "separation",
    categoryLabel: "Tách âm & Khử ồn (Audio Separation)",
    ramMinGb: 4.0,
    vramMinGb: 1.5,
    operationalNotes: "Nhẹ và nhanh hơn dòng RoFormer/MDX23C (1.5 GB - 2 GB VRAM, 4 GB RAM).",
    verifiedLanguages: null,
    source: "https://github.com/Anjok07/ultimatevocalremovergui"
  },
  {
    id: "deepfilternet",
    name: "DeepFilterNet3",
    architecture: "DeepFilterNet3 Bản chuẩn",
    category: "enhancement",
    categoryLabel: "Khử ồn & Tối ưu âm thanh",
    ramMinGb: 1.0,
    vramMinGb: 0.0,
    operationalNotes: "Khử ồn thời gian thực cực nhẹ, chạy tốt trên CPU (0 GB - 0.5 GB VRAM, 1 GB RAM).",
    verifiedLanguages: null,
    source: "https://github.com/Rikorose/DeepFilterNet"
  },
  {
    id: "mossformer",
    name: "MossFormer2 (ClearerVoice-Studio)",
    architecture: "MossFormer2",
    category: "separation",
    categoryLabel: "Tách âm & Khử ồn (Audio Separation)",
    ramMinGb: 4.0,
    vramMinGb: 2.0,
    operationalNotes: "Tách giọng nói/khử ồn chất lượng cao trong ClearerVoice-Studio (2 GB VRAM, 4 GB RAM).",
    verifiedLanguages: null,
    source: "None"
  },
  {
    id: "spleeter",
    name: "Spleeter (2stems / 4stems / 5stems)",
    architecture: "2stems / 4stems / 5stems",
    category: "separation",
    categoryLabel: "Tách âm & Khử ồn (Audio Separation)",
    ramMinGb: 2.0,
    vramMinGb: 1.0,
    operationalNotes: "Thế hệ cũ của Deezer, rất nhẹ nhưng chất lượng trung bình (1 GB - 2 GB VRAM, 2 GB - 4 GB RAM).",
    verifiedLanguages: null,
    source: "https://github.com/deezer/spleeter"
  },
  {
    id: "pyannote-seg",
    name: "pyannote-seg-3.0",
    architecture: "pyannote-seg-3.0",
    category: "diarization",
    categoryLabel: "Phân đoạn người nói (Diarization)",
    ramMinGb: 2.0,
    vramMinGb: 0.0,
    operationalNotes: "Phân đoạn người nói. Rất nhẹ, chạy nhanh trên cả CPU và GPU (~1 GB VRAM, 2 GB RAM).",
    verifiedLanguages: null,
    source: "https://huggingface.co/pyannote/segmentation-3.0"
  },
  {
    id: "camplus",
    name: "CAM++ (Speaker Embedding)",
    architecture: "CAM++",
    category: "diarization",
    categoryLabel: "Phân đoạn người nói (Diarization)",
    ramMinGb: 1.0,
    vramMinGb: 0.0,
    operationalNotes: "Trích xuất Speaker Embedding qua ONNX hoặc ModelScope (0.5 GB - 1 GB VRAM, 1 GB - 2 GB RAM).",
    verifiedLanguages: null,
    source: "None"
  },
  {
    id: "wav2vec2-gender",
    name: "Wav2Vec2-Gender",
    architecture: "Wav2Vec2 Base Gender",
    category: "gender",
    categoryLabel: "Nhận diện giới tính (Gender Classification)",
    ramMinGb: 2.0,
    vramMinGb: 0.0,
    operationalNotes: "Phân loại giới tính dựa trên kiến trúc Wav2Vec2 base (~1 GB VRAM, 2 GB RAM).",
    verifiedLanguages: null,
    source: "None"
  },
  {
    id: "yaapt-harvest",
    name: "YAAPT & Harvest (DSP F0 Pitch)",
    architecture: "YAAPT & Harvest DSP",
    category: "pitch",
    categoryLabel: "Xử lý tần số âm cơ bản (F0 Pitch)",
    ramMinGb: 0.5,
    vramMinGb: 0.0,
    operationalNotes: "Thuật toán xử lý tín hiệu số F0 thuần túy, 100% CPU không dùng GPU (< 0.5 GB RAM).",
    verifiedLanguages: null,
    source: "None"
  },
  {
    id: "vieneu",
    name: "VieNeu-TTS v3 Turbo (0.3B & 0.5B)",
    architecture: "0.3B & 0.5B GGUF/ONNX",
    category: "tts",
    categoryLabel: "Đọc văn bản (Text-to-Speech)",
    ramMinGb: 2.0,
    vramMinGb: 0.0,
    operationalNotes: "Model TTS mã nguồn mở chuyên biệt cho tiếng Việt của Phạm Nguyễn Ngọc Bảo. 25 giọng Preset + Voice Cloning (3-5s). Song ngữ Anh-Việt.",
    verifiedLanguages: ["vi", "en"],
    source: "https://huggingface.co/pnnbao-ump/VieNeu-TTS-v3-Turbo"
  },
  {
    id: "piper",
    name: "Piper TTS (VITS)",
    architecture: "VITS ONNX",
    category: "tts",
    categoryLabel: "Đọc văn bản (Text-to-Speech)",
    ramMinGb: 0.5,
    vramMinGb: 0.0,
    operationalNotes: "Hệ thống TTS cục bộ tối ưu cho CPU và thiết bị nhúng của Open Home Foundation. ~40 ngôn ngữ, >120 models.",
    verifiedLanguages: ["vi", "en", "zh"],
    source: "https://github.com/rhasspy/piper/blob/master/VOICES.md"
  },
  {
    id: "kokoro",
    name: "Kokoro-82M (StyleTTS 2)",
    architecture: "82M Parameters (StyleTTS 2)",
    category: "tts",
    categoryLabel: "Đọc văn bản (Text-to-Speech)",
    ramMinGb: 1.0,
    vramMinGb: 0.0,
    operationalNotes: "Model TTS siêu nhẹ 82M tham số, chất lượng cao, 54 giọng Preset trên 8 ngôn ngữ (US, UK, ja, zh, es, fr, hi, it, pt-BR).",
    verifiedLanguages: null,
    source: "https://huggingface.co/hexgrad/Kokoro-82M"
  },
  {
    id: "f5-tts",
    name: "F5-TTS (Diffusion Transformer + Flow Matching)",
    architecture: "Diffusion Transformer + Flow Matching",
    category: "tts",
    categoryLabel: "Đọc văn bản (Text-to-Speech)",
    ramMinGb: 4.0,
    vramMinGb: 2.5,
    operationalNotes: "Zero-shot 100% dựa vào file audio mẫu (5-10s). Hỗ trợ tiếng Việt qua F5-TTS-Vietnamese. Cần 4-6 GB RAM, 2.5-4 GB VRAM.",
    verifiedLanguages: ["en", "zh", "vi", "ja", "ko", "fr", "de", "es", "ru", "ar", "it", "pt", "hi", "th", "id"],
    source: "https://github.com/SWivid/F5-TTS"
  },
  {
    id: "vocos",
    name: "Vocos Neural Vocoder",
    architecture: "Neural Vocoder (Vocos)",
    category: "vocoder",
    categoryLabel: "Bộ chuyển đổi sóng âm (Neural Vocoder)",
    ramMinGb: 0.2,
    vramMinGb: 0.2,
    operationalNotes: "Neural Vocoder đi kèm F5-TTS chuyển đổi Mel sang sóng âm, chỉ tốn ~200MB RAM/VRAM, không phải model đọc độc lập.",
    verifiedLanguages: null,
    source: "https://github.com/gemelo-ai/vocos"
  },
  {
    id: "cosyvoice",
    name: "CosyVoice 2 (0.5B)",
    architecture: "0.5B FunAudioLLM",
    category: "tts",
    categoryLabel: "Đọc văn bản (Text-to-Speech)",
    ramMinGb: 6.0,
    vramMinGb: 3.5,
    operationalNotes: "Zero-shot Voice Cloning (3-10s) + 7 giọng Preset chuẩn (zh, en, ja, yue, ko). Cần 6-8 GB RAM, 3.5-4 GB VRAM.",
    verifiedLanguages: ["zh", "en", "ja", "ko", "de", "es", "fr", "it", "ru", "yue"],
    source: "https://github.com/FunAudioLLM/CosyVoice"
  },
  {
    id: "gpt-sovits",
    name: "GPT-SoVITS (v2 & v3)",
    architecture: "v2 & v3 (GPT + SoVITS)",
    category: "tts",
    categoryLabel: "Đọc văn bản (Text-to-Speech)",
    ramMinGb: 6.0,
    vramMinGb: 3.0,
    operationalNotes: "Voice Cloning cực mạnh kết hợp GPT và SoVITS của RVC-Boss. Zero-shot / Few-shot từ mẫu 3-10s. Cần 6-8 GB RAM, 3-4 GB VRAM.",
    verifiedLanguages: ["zh", "en", "ja", "ko", "yue"],
    source: "https://github.com/RVC-Boss/GPT-SoVITS"
  },
  {
    id: "nllb",
    name: "NLLB-200-600M (Meta)",
    architecture: "NLLB-200 distilled 600M",
    category: "translation",
    categoryLabel: "Dịch thuật máy (Machine Translation)",
    ramMinGb: 4.0,
    vramMinGb: 0.0,
    operationalNotes: "Dịch 200 ngôn ngữ, hỗ trợ tăng tốc qua CTranslate2. VRAM 1.5 GB (INT8) - 2.5 GB (FP16), 4 GB RAM.",
    verifiedLanguages: null,
    source: "https://huggingface.co/facebook/nllb-200-distilled-600M"
  },
];

export default AI_MODELS;
