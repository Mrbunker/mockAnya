import { Component, type ReactNode } from "react";
import { Button, Typography } from "@douyinfe/semi-ui";
import { getErrorMessageFromUnknown } from "../lib/result";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  detail: string;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, detail: "" };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      detail: getErrorMessageFromUnknown(error),
    };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const subTitle = this.state.detail || "请刷新页面或重启应用后重试";
    return (
      <div className="p-6">
        <Typography.Title heading={3}>应用出错</Typography.Title>
        <Typography.Text type="secondary" className="mt-2 block">
          {subTitle}
        </Typography.Text>
        <div className="mt-4">
          <Button
            type="primary"
            theme="solid"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </Button>
        </div>
      </div>
    );
  }
}
