# Vision UGC - Technical Architecture Blueprint (Mirror)

This document mirrors the exact technical configuration and service connections of the Vision UGC SaaS.

## 1. Directory Structure (Vercel Host `/`)
```text
vision/
├── public/
│   ├── favicon.ico
│   └── video/
│       ├── background.mp4
│       ├── v1.mp4             # Camilla - Yoga (ENG)
│       └── v5_ita.mp4         # Camilla - Swatch (ITA)
├── index.html                 # Main High-converting Landing
└── vercel.json                # Static Hosting Configuration
```

## 2. API Integrations
Video Generation: Fal.ai Endpoint bytedance/seedance-2.0/reference-to-video (Seedance 2.0 multi-frame face swap model).
Vocal Synthesis: ElevenLabs (Sara with ID uV2Bhcm1HwmAqPqkbjfl on eleven-v3 model).
Lead Generation: Web3Forms (Access Key: 9013a8d5-0901-42a0-b9e6-4c45553f960d).
Automations: n8n (Stripe payments routing and Google Sheets synchronization).
