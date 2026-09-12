import {
  Brain,
  FlaskConical,
  HeartPulse,
  Pill,
  Plus,
  Stethoscope,
} from 'lucide-react';
import { MedicalIcon } from './MedicalIcon';

export function HeroSection() {
  return (
    <div className="relative hidden overflow-hidden bg-[#f5faf9] lg:block">
      {/* Dot Grid Pattern */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(#cfe5e1 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />

      {/* Concentric Circles & Center Icon */}
      <div className="absolute left-1/2 top-1/2 grid size-[430px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#d7ebe8]">
        <div className="grid size-[310px] place-items-center rounded-full border border-[#d7ebe8]">
          <div className="grid size-40 place-items-center rounded-[2.5rem] border border-[#b9dcd7] bg-white/80 text-[#007b74] shadow-sm">
            <HeartPulse size={82} strokeWidth={1.1} />
          </div>
        </div>
      </div>

      {/* Floating Medical Badges */}
      <MedicalIcon className="left-[15%] top-[12%]" icon={<HeartPulse />} />
      <MedicalIcon className="right-[17%] top-[10%]" icon={<Pill />} />
      <MedicalIcon className="left-[14%] top-[45%]" icon={<Stethoscope />} />
      <MedicalIcon className="right-[13%] top-[40%]" icon={<Brain />} />
      <MedicalIcon className="bottom-[16%] left-[26%]" icon={<FlaskConical />} />
      <MedicalIcon className="bottom-[12%] right-[24%]" icon={<Plus />} />

      {/* Hero Bottom Copy */}
      <div className="absolute bottom-12 left-12 max-w-sm">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-teal-700">
          Medical education, organized
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-800 leading-tight">
          Curate knowledge.
          <br />
          <span className="text-teal-700">Elevate learning.</span>
        </h2>
        <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
          A focused workspace for building clear, reliable learning content for every student.
        </p>
      </div>
    </div>
  );
}
