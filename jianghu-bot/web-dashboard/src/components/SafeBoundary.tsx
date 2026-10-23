'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import api from '@/lib/api';
import { AlertCircle, RefreshCw, XCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  componentName?: string;
  fallbackTitle?: string;
  onExit?: () => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class SafeBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi kesalahan tidak terduga.'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SafeBoundary:${this.props.componentName || 'Component'}] caught error:`, error, errorInfo);

    // 1. Panggil /grid/building/exit agar server melepaskan status interiorInstanceId pemain
    try {
      api.post('/grid/building/exit', {}).catch(() => {});
    } catch (_) {}

    // 2. Laporkan ke client-log server
    try {
      api.post('/client-log', {
        message: error.message,
        stack: error.stack?.slice(0, 1500),
        component: this.props.componentName || 'UnknownComponent',
        componentStack: errorInfo.componentStack?.slice(0, 1000),
        url: typeof window !== 'undefined' ? window.location.href : ''
      }).catch(() => {});
    } catch (_) {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleExit = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onExit) {
      this.props.onExit();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="max-w-md w-full bg-[#0d1322] border border-amber-600/50 rounded-2xl p-6 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-950/50 border border-red-500/60 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-base sm:text-lg font-serif font-bold text-amber-200 mb-1.5">
              {this.props.fallbackTitle || 'Gagal Membuka Bangunan'}
            </h3>

            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Formasi ruang {this.props.componentName ? `(${this.props.componentName})` : ''} mengalami gangguan. Karakter Anda telah diamankan kembali ke area luar.
            </p>

            {this.state.errorMessage && (
              <div className="mb-4 p-2.5 bg-black/60 border border-red-900/40 rounded-lg text-left overflow-x-auto max-h-20 text-[11px] font-mono text-red-300">
                {this.state.errorMessage}
              </div>
            )}

            <div className="flex gap-2.5 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Buka Ulang</span>
              </button>

              <button
                onClick={this.handleExit}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700 text-xs font-medium transition-colors"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Tutup & Keluar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
