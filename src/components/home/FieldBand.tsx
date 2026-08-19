import { SectionHead } from '@/components/home/SectionHead';
import { ParallaxFigure } from '@/components/home/ParallaxFigure';

/* ==========================================================================
   FieldBand — three plates, deliberately out of alignment.

   The composition is asymmetric by row placement rather than by margin
   guesswork, so it collapses to a clean single column on narrow screens.
   ========================================================================== */

export function FieldBand() {
  return (
    <section aria-label="In the field" className="shell section overflow-hidden">
      <SectionHead
        index="06"
        label="Field"
        title={['BUILT FOR THE', 'UNEXPECTED.']}
        lead="Tested on transit days, high passes and coastlines — the conditions the catalogue is written for."
      />

      <div className="grid-12 mt-16 gap-y-16 md:mt-24 lg:gap-y-0">
        <ParallaxFigure
          src="/media/field-highpass.webp"
          alt="A high mountain pass under moving cloud"
          caption="High pass"
          index="01"
          depth={34}
          aspect="aspect-[16/10]"
          sizes="(min-width: 1024px) 48vw, (min-width: 768px) 58vw, 100vw"
          className="col-span-4 md:col-span-7 lg:col-span-6 lg:col-start-1 lg:row-start-1"
        />

        <ParallaxFigure
          src="/media/field-treeline.webp"
          alt="The treeline at the edge of a climb"
          caption="Treeline"
          index="02"
          depth={-58}
          aspect="aspect-[3/4]"
          sizes="(min-width: 1024px) 32vw, (min-width: 768px) 40vw, 100vw"
          className="col-span-4 md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:mt-[13rem]"
        />

        <ParallaxFigure
          src="/media/field-coastal.webp"
          alt="A coastal approach in flat winter light"
          caption="Coastal"
          index="03"
          depth={26}
          aspect="aspect-[16/10]"
          sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
          className="col-span-4 md:col-span-6 md:col-start-2 lg:col-span-5 lg:col-start-3 lg:row-start-2 lg:-mt-[9rem]"
        />
      </div>
    </section>
  );
}
