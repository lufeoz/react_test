import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <span className="error-boundary-icon">!</span>
            <h2 className="error-boundary-title">문제가 발생했어요</h2>
            <p className="error-boundary-message">
              일시적인 오류입니다. 다시 시도해주세요.
            </p>
            <button className="error-boundary-btn" onClick={this.handleReset}>
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
