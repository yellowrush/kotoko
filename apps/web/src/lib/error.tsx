import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // 隐私约束：错误日志不得包含儿童数据。仅记录匿名错误信息。
    console.error('[AppError]', error.message, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-lg font-semibold">エラーが発生しました</h1>
          <p className="text-sm text-gray-500">お手数ですが、画面を再読み込みしてください。</p>
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
          >
            再読み込み
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}