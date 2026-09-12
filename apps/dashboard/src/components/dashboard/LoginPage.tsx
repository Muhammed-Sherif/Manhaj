import { HeroSection, LoginForm } from './login';

interface LoginPageProps {
  onLogin: (token: string) => void;
}
export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="grid min-h-screen overflow-hidden lg:grid-cols-[1.08fr_.92fr]">
      {/* Decorative Graphic Hero Panel */}
      <HeroSection />
      {/* Interactive Login & OAuth Form */}
      <LoginForm onLogin={onLogin} />
    </div>
  );
}
