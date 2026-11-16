
import React, { useState } from 'react';
import {
  Leaf,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  UtensilsCrossed,
  Timer,
  Heart,
  Stethoscope,
  Check,
  ChevronRight,
  Apple,
  Clock,
  Activity,
  Sprout,
  Droplets,
  Menu,
  X,
  Sun,
  CalendarDays,
  TrendingUp,
  Salad,
  CircleCheck,
  Flower2,
} from 'lucide-react';

const features = [
  {
    number: '01',
    icon: UtensilsCrossed,
    title: 'Dinh dưỡng thực vật',
    subtitle: 'Ăn uống cân bằng',
    description:
      'Theo dõi bữa ăn, năng lượng và chất xơ mỗi ngày. Xây dựng thói quen ưu tiên rau xanh, các loại đậu và ngũ cốc nguyên hạt.',
    color: 'bg-[#E8EFE4]',
    iconColor: 'text-[#426348]',
  },
  {
    number: '02',
    icon: Timer,
    title: 'Nhịn ăn gián đoạn',
    subtitle: 'Cân bằng thời gian',
    description:
      'Theo dõi thời gian ăn và nghỉ một cách chủ động, xây dựng lịch sinh hoạt phù hợp với nhu cầu cá nhân.',
    color: 'bg-[#F1EBDD]',
    iconColor: 'text-[#947345]',
  },
  {
    number: '03',
    icon: Sprout,
    title: 'Chu kỳ FMD 5 ngày',
    subtitle: 'Lộ trình dinh dưỡng',
    description:
      'Tìm hiểu chế độ ăn mô phỏng nhịn ăn với lộ trình 5 ngày và các thông tin cần thiết để theo dõi.',
    color: 'bg-[#E8ECE5]',
    iconColor: 'text-[#60765B]',
  },
  {
    number: '04',
    icon: Stethoscope,
    title: 'Tư vấn chuyên gia',
    subtitle: 'Đồng hành sức khỏe',
    description:
      'Kết nối với chuyên gia, theo dõi lịch tư vấn và tiếp nhận những gợi ý chăm sóc sức khỏe phù hợp.',
    color: 'bg-[#F0E9E4]',
    iconColor: 'text-[#96715D]',
  },
];

export default function LandingPage({
  onGoToDashboard,
  onOpenAuthModal,
}) {
  const [activeFeatureTab, setActiveFeatureTab] = useState('diet');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
    });
    setMobileMenuOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#F8F8F3] text-[#252C25] font-sans selection:bg-[#DCE8D9] selection:text-[#244C35]">

      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-[#E8E9E1] bg-[#F8F8F3]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-5 md:px-8 xl:px-12">

          <button
            onClick={() => window.scrollTo({
              top: 0,
              behavior: 'smooth',
            })}
            className="flex items-center gap-3 text-left"
            aria-label="Về đầu trang"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#244C3B] text-white">
              <Leaf size={23} strokeWidth={1.8} />
            </div>

            <div>
              <div className="text-[17px] font-extrabold tracking-[0.12em] text-[#24372B]">
                LONGEVITY
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.19em] text-[#788675]">
                Health & Longevity
              </div>
            </div>
          </button>

          <nav className="hidden items-center gap-9 lg:flex">
            {[
              ['features', 'Giải pháp'],
              ['philosophy', 'Triết lý sống thọ'],
              ['science', 'Khoa học'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => goToSection(id)}
                className="text-[13px] font-semibold text-[#626D61] transition-colors hover:text-[#244C3B]"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-5 sm:flex">
            <button
              onClick={onOpenAuthModal}
              className="text-[13px] font-semibold text-[#526052] transition-colors hover:text-[#244C3B]"
            >
              Đăng nhập
            </button>

            <button
              onClick={onGoToDashboard}
              className="flex items-center gap-2 rounded-xl bg-[#285A43] px-5 py-3 text-[12px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1F4834] hover:shadow-lg"
            >
              Vào ứng dụng
              <ArrowUpRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-[#E5E8DF] p-2.5 text-[#31523B] sm:hidden"
            aria-label="Mở menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#E8E9E1] bg-[#F8F8F3] px-5 py-5 sm:hidden">
            <div className="flex flex-col gap-4">
              <button onClick={() => goToSection('features')} className="text-left text-sm font-semibold">
                Giải pháp
              </button>
              <button onClick={() => goToSection('philosophy')} className="text-left text-sm font-semibold">
                Triết lý sống thọ
              </button>
              <button onClick={() => goToSection('science')} className="text-left text-sm font-semibold">
                Khoa học
              </button>
              <button onClick={onOpenAuthModal} className="rounded-xl border border-[#DDE2D8] py-3 text-sm font-bold">
                Đăng nhập
              </button>
              <button onClick={onGoToDashboard} className="rounded-xl bg-[#285A43] py-3 text-sm font-bold text-white">
                Vào ứng dụng
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ================= HERO ================= */}
      <section className="overflow-hidden px-5 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20 xl:px-12">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">

          {/* LEFT CONTENT */}
          <div className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#DDE6D8] bg-[#EEF3EA] px-4 py-2 text-[11px] font-bold tracking-wide text-[#41634A]">
              <Sparkles size={14} />
              KHOA HỌC DINH DƯỠNG & LỐI SỐNG
            </div>

            <h1 className="max-w-[650px] text-[43px] font-extrabold leading-[1.13] tracking-[-0.055em] text-[#24352A] sm:text-[55px] md:text-[64px] xl:text-[70px]">
              Sống khỏe
              <br />
              hôm nay.
              <br />
              <span className="font-medium italic text-[#64816A]">
                Trường thọ
              </span>
              <br />
              ngày mai.
            </h1>

            <p className="mt-7 max-w-[510px] text-[14px] leading-[1.95] text-[#6C756B] md:text-[15px]">
              Hành trình chăm sóc sức khỏe bắt đầu từ những điều nhỏ
              nhất. LONGEVITY giúp bạn theo dõi dinh dưỡng, xây dựng
              thói quen sống lành mạnh và kết nối với chuyên gia
              trên cùng một nền tảng.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onGoToDashboard}
                className="group flex items-center justify-center gap-3 rounded-xl bg-[#285A43] px-7 py-4 text-[13px] font-bold text-white shadow-[0_10px_25px_rgba(40,90,67,0.16)] transition-all hover:-translate-y-1 hover:bg-[#1F4834] hover:shadow-[0_14px_30px_rgba(40,90,67,0.23)]"
              >
                Khám phá LONGEVITY
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={onOpenAuthModal}
                className="rounded-xl border border-[#DDE1D8] bg-white px-7 py-4 text-[13px] font-bold text-[#415344] transition-all hover:border-[#A8B9A7] hover:bg-[#F3F6EF]"
              >
                Tạo tài khoản
              </button>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#E6E8DF] pt-6">
              {[
                'Dinh dưỡng cân bằng',
                'Thói quen lành mạnh',
                'Chăm sóc dài lâu',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[11px] font-medium text-[#697568]">
                  <Check size={14} className="text-[#54805A]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT VISUAL */}
          <div className="relative mx-auto w-full max-w-[590px] lg:ml-auto">

            <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-[#E5EBDC] blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-44 w-44 rounded-full bg-[#EAE2D1] blur-3xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-[#E7E8DE] bg-white p-4 shadow-[0_25px_80px_rgba(48,65,45,0.10)] sm:p-6">

              <div className="flex items-center justify-between border-b border-[#EDF0E9] pb-5">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#82907D]">
                    YOUR WELLNESS SPACE
                  </div>
                  <h3 className="mt-2 text-[18px] font-extrabold tracking-tight text-[#293D2D]">
                    Chăm sóc sức khỏe mỗi ngày
                  </h3>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF3E9] text-[#4E7655]">
                  <Activity size={19} />
                </div>
              </div>

              {/* Preview tabs */}
              <div className="mt-5 flex gap-1 rounded-xl bg-[#F4F5F0] p-1">
                {[
                  ['diet', 'Dinh dưỡng'],
                  ['fasting', 'Nhịn ăn'],
                  ['doctor', 'Chuyên gia'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setActiveFeatureTab(value)}
                    className={`flex-1 rounded-lg px-2 py-2.5 text-[10px] font-bold transition-all sm:text-[11px] ${activeFeatureTab === value
                        ? 'bg-white text-[#315B3D] shadow-sm'
                        : 'text-[#879084] hover:text-[#405B43]'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* DIET PREVIEW */}
              {activeFeatureTab === 'diet' && (
                <div className="animate-fade-in space-y-4 pt-5">

                  <div className="rounded-2xl bg-[#F3F6EF] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#82917D]">
                          Năng lượng hôm nay
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-[36px] font-extrabold tracking-tight text-[#294C35]">
                            920
                          </span>
                          <span className="text-[11px] font-medium text-[#879182]">
                            / 1.850 kcal
                          </span>
                        </div>
                      </div>

                      <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full"
                        style={{
                          background: 'conic-gradient(#4F8059 0% 50%, #DCE5D8 50% 100%)',
                        }}
                      >
                        <div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-[#F3F6EF]">
                          <span className="text-[17px] font-extrabold text-[#315B3D]">50%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-[#6D8069]">
                      <span>Tiến độ năng lượng</span>
                      <span>Hôm nay</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[#EAEDE5] bg-white p-4">
                      <div className="flex items-center gap-2 text-[#64805D]">
                        <Sprout size={16} />
                        <span className="text-[10px] font-bold">Chất xơ</span>
                      </div>
                      <div className="mt-3 text-[25px] font-extrabold text-[#334B36]">
                        30.5g
                      </div>
                      <div className="mt-1 text-[10px] text-[#899284]">Mục tiêu 35g</div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E9EEE5]">
                        <div className="h-full w-[87%] rounded-full bg-[#73936D]" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#EAEDE5] bg-white p-4">
                      <div className="flex items-center gap-2 text-[#A17B48]">
                        <Apple size={16} />
                        <span className="text-[10px] font-bold">Bữa ăn</span>
                      </div>
                      <div className="mt-3 text-[25px] font-extrabold text-[#574A37]">
                        03
                      </div>
                      <div className="mt-1 text-[10px] text-[#899284]">Bữa đã ghi nhận</div>
                      <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-[#9A815B]">
                        <CircleCheck size={12} />
                        Theo dõi đầy đủ
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-[#EBEDE6] p-3">
                    <img
                      src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=160&q=85"
                      alt="Bữa ăn rau củ và thực vật"
                      className="h-[72px] w-[86px] rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[#899184]">
                        Gợi ý bữa ăn
                      </div>
                      <div className="mt-1 text-[12px] font-extrabold text-[#344B36]">
                        Salad rau củ & đậu
                      </div>
                      <div className="mt-1 text-[10px] text-[#899184]">
                        Ưu tiên thực phẩm giàu chất xơ
                      </div>
                    </div>
                    <ChevronRight size={17} className="shrink-0 text-[#87947F]" />
                  </div>
                </div>
              )}

              {/* FASTING PREVIEW */}
              {activeFeatureTab === 'fasting' && (
                <div className="animate-fade-in space-y-4 pt-5">
                  <div className="rounded-2xl bg-[#F3F5EF] p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E4EBDD] text-[#53714D]">
                      <Clock size={23} />
                    </div>
                    <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#879481]">
                      Theo dõi thời gian nhịn ăn
                    </div>
                    <div className="mt-2 text-[40px] font-extrabold tracking-tight text-[#31533B]">
                      14:15
                    </div>
                    <div className="mt-1 text-[11px] text-[#7E8B79]">
                      Trong kế hoạch 16 giờ
                    </div>
                    <div className="mx-auto mt-5 h-2 max-w-[300px] overflow-hidden rounded-full bg-[#DDE5D9]">
                      <div className="h-full w-[89%] rounded-full bg-[#638663]" />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-[#899284]">
                      <span>Bắt đầu</span>
                      <span>Mục tiêu 16 giờ</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[#EAEDE5] p-4">
                      <Sun size={18} className="text-[#B38B50]" />
                      <div className="mt-3 text-[12px] font-bold text-[#435441]">
                        Khung nghỉ
                      </div>
                      <div className="mt-1 text-[10px] text-[#899284]">
                        Theo dõi lịch cá nhân
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#EAEDE5] p-4">
                      <Heart size={18} className="text-[#A87970]" />
                      <div className="mt-3 text-[12px] font-bold text-[#435441]">
                        Thói quen
                      </div>
                      <div className="mt-1 text-[10px] text-[#899284]">
                        Duy trì lịch sinh hoạt
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCTOR PREVIEW */}
              {activeFeatureTab === 'doctor' && (
                <div className="animate-fade-in space-y-4 pt-5">
                  <div className="flex items-center gap-4 rounded-2xl bg-[#F4F3EE] p-5">
                    <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-2xl bg-[#E5E9DE] text-[#547052]">
                      <Stethoscope size={28} />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[#929486]">
                        Chuyên gia đồng hành
                      </div>
                      <div className="mt-1 text-[15px] font-extrabold text-[#354B38]">
                        BS. Trần Văn Hùng
                      </div>
                      <div className="mt-1 text-[10px] text-[#7D8878]">
                        Dinh dưỡng & sức khỏe
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EAEDE5] p-5">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-[#40523E]">
                        Lịch tư vấn sắp tới
                      </div>
                      <CalendarDays size={17} className="text-[#789078]" />
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-[#EEF3E9]">
                        <span className="text-[9px] font-bold text-[#789078]">THỨ BA</span>
                        <span className="text-xl font-extrabold text-[#34533A]">15:00</span>
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-[#435441]">
                          Buổi tư vấn dinh dưỡng
                        </div>
                        <div className="mt-1 text-[10px] text-[#899284]">
                          Trao đổi cùng chuyên gia
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-[#F4F6F0] p-3 text-[10px] font-medium text-[#667D60]">
                    <ShieldCheck size={15} />
                    Theo dõi lịch hẹn và lời khuyên sức khỏe
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-[#EDF0E9] pt-4">
                <span className="text-[10px] text-[#929A8E]">
                  Khám phá các tính năng của LONGEVITY
                </span>
                <button
                  onClick={onGoToDashboard}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#416B49] hover:text-[#244C35]"
                >
                  Trải nghiệm
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-[#E9E8DD] bg-white p-4 shadow-lg sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF3E8] text-[#547C54]">
                <Leaf size={19} />
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-[#3C513D]">
                  Sống khỏe mỗi ngày
                </div>
                <div className="mt-1 text-[9px] text-[#899284]">
                  Bắt đầu từ những thói quen nhỏ
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST STRIP ================= */}
      <section className="border-y border-[#E8E9E1] bg-[#F0F2EA] px-5 py-8 md:px-8">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-7 sm:grid-cols-3 sm:gap-4">
          {[
            [Sprout, 'Dinh dưỡng thực vật', 'Ưu tiên thực phẩm tự nhiên'],
            [Activity, 'Theo dõi thói quen', 'Quan sát tiến trình mỗi ngày'],
            [Heart, 'Chăm sóc dài lâu', 'Hướng đến sức khỏe bền vững'],
          ].map(([Icon, title, description]) => (
            <div key={title} className="flex items-center justify-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#58765A]">
                <Icon size={20} />
              </div>
              <div>
                <div className="text-[12px] font-bold text-[#405440]">{title}</div>
                <div className="mt-1 text-[10px] text-[#899284]">{description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FOUR PILLARS ================= */}
      <section id="features" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-28 xl:px-12">
        <div className="mx-auto max-w-[1280px]">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#71836B]">
                <span className="h-px w-7 bg-[#81977C]" />
                Hệ sinh thái LONGEVITY
              </div>

              <h2 className="max-w-[620px] text-[32px] font-extrabold leading-tight tracking-[-0.045em] text-[#293B2D] md:text-[43px]">
                Bốn nền tảng cho
                <br />
                một lối sống khỏe mạnh.
              </h2>
            </div>

            <p className="max-w-[400px] text-[13px] leading-[1.9] text-[#7B8478]">
              Kết hợp những thói quen dinh dưỡng, vận động và
              chăm sóc sức khỏe thành một hành trình có thể
              theo dõi và duy trì lâu dài.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.number}
                  className="group flex min-h-[285px] flex-col rounded-[22px] border border-[#E8E9E0] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#C7D4C3] hover:shadow-[0_15px_35px_rgba(46,68,45,0.07)]"
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.color} ${feature.iconColor}`}>
                      <Icon size={23} strokeWidth={1.7} />
                    </div>
                    <span className="text-[11px] font-bold tracking-widest text-[#B0B7A9]">
                      {feature.number}
                    </span>
                  </div>

                  <div className="mt-8 text-[10px] font-bold uppercase tracking-[0.13em] text-[#84927D]">
                    {feature.subtitle}
                  </div>

                  <h3 className="mt-2 text-[17px] font-extrabold tracking-tight text-[#334735]">
                    {feature.title}
                  </h3>

                  <p className="mt-3 flex-1 text-[12px] leading-[1.9] text-[#7B8578]">
                    {feature.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-[11px] font-bold text-[#537657] transition-all group-hover:gap-3">
                    Khám phá
                    <ArrowRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= PHILOSOPHY ================= */}
      <section id="philosophy" className="scroll-mt-24 bg-[#EDF0E7] px-5 py-20 md:px-8 md:py-24 xl:px-12">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-2 lg:gap-20">

          <div className="relative overflow-hidden rounded-[26px]">
            <img
              src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1000&q=90"
              alt="Thực phẩm tươi và chế độ ăn lành mạnh"
              className="h-[360px] w-full object-cover sm:h-[470px]"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#1D3025]/65 via-transparent to-transparent" />

            <div className="absolute bottom-7 left-7 right-7">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
                THE BLUE ZONES PHILOSOPHY
              </div>
              <div className="mt-2 text-[23px] font-extrabold leading-tight text-white sm:text-[30px]">
                Sống đơn giản.
                <br />
                Sống khỏe dài lâu.
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#71836B]">
              <Flower2 size={15} />
              Triết lý sống thọ
            </div>

            <h2 className="mt-5 text-[34px] font-extrabold leading-[1.2] tracking-[-0.045em] text-[#2C4030] md:text-[45px]">
              Những thói quen
              <br />
              nhỏ, giá trị lớn.
            </h2>

            <p className="mt-5 text-[13px] leading-[2] text-[#737E70]">
              Từ Okinawa đến Sardinia, những cộng đồng sống thọ
              trên thế giới cho chúng ta thấy rằng sức khỏe không
              chỉ đến từ một chế độ ăn, mà còn từ cách chúng ta
              sống mỗi ngày.
            </p>

            <div className="mt-8 space-y-6">
              {[
                ['Hara Hachi Bu', 'Ăn chậm, chú ý tín hiệu no và dừng lại khi cảm thấy vừa đủ.'],
                ['Plant-Slant', 'Ưu tiên rau xanh, các loại đậu, hạt và thực phẩm có nguồn gốc thực vật.'],
                ['Natural Rhythm', 'Duy trì nhịp sinh hoạt, vận động và nghỉ ngơi phù hợp.'],
              ].map(([title, description], index) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#587557]">
                    0{index + 1}
                  </div>
                  <div>
                    <h3 className="text-[13px] font-extrabold text-[#3D543E]">
                      {title}
                    </h3>
                    <p className="mt-1 text-[11px] leading-[1.8] text-[#7A8475]">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => goToSection('science')}
              className="mt-9 flex items-center gap-2 text-[12px] font-bold text-[#426747] transition-all hover:gap-3"
            >
              Tìm hiểu thêm về triết lý
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ================= SCIENCE ================= */}
      <section id="science" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-24 xl:px-12">
        <div className="mx-auto max-w-[1050px]">
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7A8A73]">
              Khoa học & kiến thức
            </div>
            <h2 className="mt-4 text-[30px] font-extrabold tracking-[-0.04em] text-[#2E4031] md:text-[40px]">
              Hiểu cơ thể. Sống chủ động.
            </h2>
            <p className="mx-auto mt-4 max-w-[620px] text-[13px] leading-[1.9] text-[#7C8579]">
              Trang bị kiến thức để bạn hiểu hơn về dinh dưỡng,
              thói quen ăn uống và những nguyên tắc chăm sóc
              sức khỏe dựa trên cơ sở khoa học.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-[#E8EAE1] bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF3E9] text-[#58775A]">
                <Apple size={21} />
              </div>
              <h3 className="mt-5 text-[15px] font-extrabold text-[#3A503B]">
                Dinh dưỡng cân bằng
              </h3>
              <p className="mt-2 text-[12px] leading-[1.9] text-[#828A7F]">
                Hiểu về năng lượng, nhóm chất, chất xơ và vai trò
                của thực phẩm trong chế độ ăn hằng ngày.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#E8EAE1] bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EEE4] text-[#A17C49]">
                <Clock size={21} />
              </div>
              <h3 className="mt-5 text-[15px] font-extrabold text-[#3A503B]">
                Nhịp sinh học
              </h3>
              <p className="mt-2 text-[12px] leading-[1.9] text-[#828A7F]">
                Tìm hiểu mối liên hệ giữa ăn uống, giấc ngủ,
                thời gian nghỉ ngơi và nhịp sống.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#E8EAE1] bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0EAE6] text-[#99735F]">
                <Heart size={21} />
              </div>
              <h3 className="mt-5 text-[15px] font-extrabold text-[#3A503B]">
                Sức khỏe dài lâu
              </h3>
              <p className="mt-2 text-[12px] leading-[1.9] text-[#828A7F]">
                Xây dựng những thói quen phù hợp để duy trì
                sức khỏe thể chất và tinh thần.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="px-5 pb-20 md:px-8 md:pb-24 xl:px-12">
        <div className="relative mx-auto max-w-[1180px] overflow-hidden rounded-[28px] bg-[#294C38] px-7 py-14 text-center sm:px-12 md:py-20">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-36 -left-20 h-80 w-80 rounded-full border border-white/10" />

          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B9CFB5]">
              YOUR JOURNEY STARTS HERE
            </div>

            <h2 className="mx-auto mt-5 max-w-[650px] text-[30px] font-extrabold leading-tight tracking-[-0.04em] text-white md:text-[45px]">
              Một cuộc sống khỏe mạnh
              <br />
              bắt đầu từ hôm nay.
            </h2>

            <p className="mx-auto mt-5 max-w-[510px] text-[12px] leading-[1.9] text-[#D0DDD0] md:text-[13px]">
              Khám phá các công cụ theo dõi dinh dưỡng và
              xây dựng hành trình sống khỏe cùng LONGEVITY.
            </p>

            <button
              onClick={onGoToDashboard}
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-[#F4F3EA] px-7 py-4 text-[12px] font-extrabold text-[#31543A] transition-all hover:-translate-y-1 hover:bg-white"
            >
              Bắt đầu trải nghiệm
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-[#E7E9DF] bg-white px-5 py-10 md:px-8 xl:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-8 md:flex-row md:items-center">

          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#294C38] text-white">
                <Leaf size={20} />
              </div>
              <div>
                <div className="text-[15px] font-extrabold tracking-[0.13em] text-[#294432]">
                  LONGEVITY
                </div>
                <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#849181]">
                  Health & Longevity
                </div>
              </div>
            </div>

            <p className="mt-4 max-w-[400px] text-[11px] leading-[1.8] text-[#899184]">
              Nền tảng hỗ trợ theo dõi dinh dưỡng và xây dựng
              lối sống lành mạnh, hướng đến sức khỏe bền vững.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-7 gap-y-3 text-[11px] font-semibold text-[#6D796A]">
            <button onClick={() => goToSection('features')} className="hover:text-[#294C38]">
              Giải pháp
            </button>
            <button onClick={() => goToSection('philosophy')} className="hover:text-[#294C38]">
              Triết lý sống thọ
            </button>
            <button onClick={onOpenAuthModal} className="hover:text-[#294C38]">
              Đăng nhập
            </button>
            <button onClick={onGoToDashboard} className="hover:text-[#294C38]">
              Vào ứng dụng
            </button>
          </div>
        </div>

        <div className="mx-auto mt-9 max-w-[1280px] border-t border-[#EDF0E9] pt-5 text-[10px] text-[#A0A69A]">
          © {new Date().getFullYear()} LONGEVITY. Health & Longevity.
        </div>
      </footer>
    </main>
  );
}
