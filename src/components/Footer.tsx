import Image from "next/image";

const steps = [
  {
    number: "1",
    text: "Register Household & Book Items Online",
  },
  {
    number: "2",
    text: "Confirm via WhatsApp within 72 Hours",
  },
  {
    number: "3",
    text: "Get Accredited & Pay/Collect Physical Tickets at the Church Desk",
  },
];

export default function Footer() {
  return (
    <footer>
      <section className="bg-navy text-white" aria-label="How booking works">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Three simple steps</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.number}
                className="rounded-2xl bg-white/10 p-5"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-champions text-xl font-bold text-white">
                  {step.number}
                </span>
                <p className="mt-4 text-lg font-bold leading-snug">
                  Step {step.number}: {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <div className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col items-start gap-4 rounded-2xl border-2 border-myndora bg-white px-4 py-4 shadow-sm sm:w-auto sm:flex-row sm:items-center">
            <Image
              src="/myndora-logo.png"
              alt="Myndora Solutions"
              width={1520}
              height={332}
              className="myndora-logo"
            />
            <p className="text-lg font-bold leading-snug text-navy">
              Powered by Myndora Solutions Ltd.
            </p>
          </div>
          <p className="text-base font-semibold text-navy">
            Canaan Ministries (a.k.a. Champions&apos; Church)
          </p>
        </div>
      </div>
    </footer>
  );
}
