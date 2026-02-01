import { CircularLoader } from './custom/prompt/loader';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return <CircularLoader size={size} className={className} />;
}