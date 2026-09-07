const leaders = [
  {
    name: "عبدالله محمد المطيري",
    position: "رئيس النادي",
  },
  {
    name: "نائب رئيس النادي",
    position: "نائب رئيس النادي",
  },
];

export default function LeadershipPreview() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        <h2 className="text-4xl font-bold text-center text-[#800020] mb-4">
          رؤساء النادي
        </h2>

        <p className="text-center text-gray-600 mb-12">
          فريق القيادة في نادي التمريض
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {leaders.map((leader, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 border-2 border-[#D4AF37] shadow-sm text-center"
            >

              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#800020] flex items-center justify-center">
                <span className="text-4xl text-white">
                  👤
                </span>
              </div>

              <h3 className="text-2xl font-bold text-[#800020]">
                {leader.name}
              </h3>

              <p className="mt-3 text-[#D4AF37] font-bold">
                {leader.position}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}