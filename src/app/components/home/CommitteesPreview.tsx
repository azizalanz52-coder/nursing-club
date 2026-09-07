import Link from 'next/link';

const committeesPreviewData = [
  { id: 'design', name: 'لجنة التصميم', description: 'الهوية البصرية وتصميم البوسترات.', icon: '🎨' },
  { id: 'media', name: 'لجنة الإعلام', description: 'إدارة منصات التواصل والتغطيات.', icon: '📸' },
  { id: 'pr', name: 'لجنة العلاقات العامة', description: 'بناء الشراكات والتنسيق الخارجي.', icon: '🌐' },
  { id: 'quality', name: 'لجنة الجودة والتطوير', description: 'تقييم الأداء وتحسين العمل المؤسسي.', icon: '📊' },
  { id: 'scientific', name: 'لجنة المحتوى العلمي', description: 'المطويات الطبية والدعم الأكاديمي.', icon: '🔬' },
  { id: 'hr', name: 'لجنة الموارد البشرية', description: 'إدارة الأعضاء والتحفيز والتقييم.', icon: '👥' },
  { id: 'events-org', name: 'لجنة التنظيم والفعاليات', description: 'التخطيط الميداني وإدارة الفعاليات.', icon: '📅' },
];

export default function CommitteesPreview() {
  return (
    <section className="py-20 bg-slate-50/50 border-t border-slate-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase">
            هيكلتنا التنظيمية
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            لجان نادي التمريض
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            سبع لجان تخصصية تعمل بتناغم لصنع بيئة طلابية رائدة ومميزة. اضغط على أي لجنة لاستعراض قادتها وأعضائها.
          </p>
        </div>

        {/* شبكة اللجان المصغرة في الهوم */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {committeesPreviewData.map((committee) => (
            <Link
              key={committee.id}
              href={`/team/${committee.id}`}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-[#630517]/40 hover:scale-[1.02] transition-all flex items-start gap-4 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#630517]/10 border border-[#630517]/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-[#630517] group-hover:text-white transition-all">
                {committee.icon}
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base group-hover:text-[#630517] transition-colors">
                  {committee.name}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {committee.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link
            href="/team"
            className="inline-block bg-[#630517] text-[#F5D061] px-8 py-3.5 rounded-full font-black text-sm shadow-lg hover:brightness-110 hover:scale-105 transition-all"
          >
            عرض كافة اللجان والقادة والأعضاء ←
          </Link>
        </div>

      </div>
    </section>
  );
}