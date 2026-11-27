import React from 'react';
import { RefreshCw } from 'lucide-react';
import { mapFirebaseAuthError } from '../lib/firebase.ts';

interface State {
  hasError: boolean;
  message: string;
}

export class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: mapFirebaseAuthError(error, 'An unexpected error occurred.')
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#071716] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 space-y-4">
            <h1 className="font-display text-lg font-bold text-[#E9F5F2]">
              Something went wrong
            </h1>
            <p className="text-sm text-[#98BEB6] leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-[#06201E] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
