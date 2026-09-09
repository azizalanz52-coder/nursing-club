export default function Statistics() {

  const stats = [
    {
      number: "200+",
      title: "عضو"
    },
    {
      number: "15+",
      title: "فعالية"
    },
    {
      number: "رؤية",
      title: "صناعة أثر مستدام"
    }
  ];


  return (
    <section className="py-20 bg-[#800020]">

      <div className="max-w-6xl mx-auto px-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {stats.map((item, index) => (
            <div
              key={index}
              className="text-center border-2 border-[#D4AF37] rounded-2xl p-8"
            >

              <h3 className="text-5xl font-bold text-[#D4AF37]">
                {item.number}
              </h3>

              <p className="text-white text-xl mt-4">
                {item.title}
              </p>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}