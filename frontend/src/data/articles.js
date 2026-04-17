/**
 * Knowledge base articles — static content for SEO.
 *
 * Each article targets a specific long-tail keyword cluster.
 * Sections use heading text that maps to h2/h3 in the Article page.
 */

const articles = [
  {
    slug: 'car-breakdown-what-to-do',
    title: 'What to Do When Your Car Breaks Down',
    description: 'Step-by-step guide on staying safe and getting help when your vehicle breaks down on the road, highway, or in traffic.',
    keywords: 'car breakdown, vehicle broke down, car stopped working, roadside emergency, what to do car breakdown',
    category: 'emergency',
    readTime: 6,
    date: '2025-12-10',
    sections: [
      {
        heading: 'Stay Calm and Get to Safety',
        content: `The first few seconds after your car breaks down are the most critical. Turn on your hazard lights immediately — this is your number one priority. If the engine is still running but losing power, try to steer towards the left shoulder or the nearest safe spot off the road.\n\nIf you're on a highway, never stop in the middle lane. Coast to the shoulder even if it means driving on a flat tire for a short distance — a damaged rim is far cheaper than a highway collision. Once stopped, keep your seatbelt on and stay inside the vehicle if traffic is heavy.`,
      },
      {
        heading: 'Make Your Vehicle Visible',
        content: `After you've safely stopped, take these steps to alert other drivers:\n\n- Keep your hazard lights on at all times\n- If you have reflective triangles or flares, place them 50, 100, and 150 meters behind your car\n- Pop the hood open — this is a universal signal that a car is disabled\n- At night, turn on your dome light so other drivers can see the vehicle is occupied\n\nVisibility is especially important on curves, hills, and during low-light conditions.`,
      },
      {
        heading: 'Assess the Situation',
        content: `Once you're safe, try to identify the problem:\n\n- **Engine won't start**: Could be the battery, starter motor, or fuel pump\n- **Overheating**: Steam or a temperature gauge in the red zone\n- **Flat tire**: Thumping noise, pulling to one side, visible deflation\n- **Smoke from engine bay**: Could indicate an oil leak, coolant leak, or electrical issue\n- **Strange noises then sudden stop**: Possible timing belt or engine failure\n\nDon't try to fix complex issues on the roadside. Quick fixes like changing a tire are fine, but anything involving the engine should wait for a mechanic.`,
      },
      {
        heading: 'Call for Help',
        content: `If you can't resolve the issue yourself, it's time to call for help:\n\n1. **Call a mobile mechanic** — services like Mobile Mechanic can dispatch someone to your location within minutes\n2. **Contact your insurance** — many policies include roadside assistance\n3. **Call a friend or family member** — they can come to your location or help coordinate\n\nWhen calling for help, share your exact location (use your phone's GPS or look for nearby landmarks, highway markers, or cross streets). Describe the symptoms clearly — this helps the mechanic bring the right tools and parts.`,
      },
      {
        heading: 'What NOT to Do',
        content: `Avoid these common mistakes:\n\n- **Don't stand behind your car** — you could be struck by passing traffic\n- **Don't open the hood if you see steam** — pressurized coolant can cause severe burns. Wait 15-20 minutes for it to cool\n- **Don't accept rides from strangers** — call someone you trust or a professional service\n- **Don't try to push the car alone** in traffic — wait for help\n- **Don't keep trying to start a car that won't turn over** — you'll drain the battery and could damage the starter`,
      },
    ],
  },
  {
    slug: 'flat-tire-repair-guide',
    title: 'Flat Tire: How to Handle It and When to Call a Mechanic',
    description: 'Complete guide to dealing with a flat tire — from roadside tire changes to understanding when a tire can be repaired vs. replaced.',
    keywords: 'flat tire, tire puncture, change tire, spare tire, tire repair, tire replacement, flat tire repair near me',
    category: 'emergency',
    readTime: 5,
    date: '2025-12-15',
    sections: [
      {
        heading: 'Signs of a Flat Tire',
        content: `You might have a flat tire if you notice:\n\n- **Pulling**: The car drifts to one side while driving straight\n- **Thumping or flapping sound**: Especially at low speeds\n- **Vibration in the steering wheel**: More pronounced as speed increases\n- **Dashboard warning light**: TPMS (Tire Pressure Monitoring System) light comes on\n- **Visual check**: The tire looks visibly deflated or sagging\n\nIf you suspect a flat, slow down gradually — don't brake hard. Find a flat, firm surface away from traffic to pull over.`,
      },
      {
        heading: 'Can You Change It Yourself?',
        content: `You can change a tire yourself if you have:\n\n1. A spare tire (check that it's properly inflated)\n2. A jack and lug wrench (usually stored under the trunk floor or behind a panel)\n3. A flat, stable surface\n\n**Steps to change a tire:**\n1. Loosen the lug nuts slightly before jacking up the car (1/4 turn)\n2. Place the jack under the vehicle's jack point (check your owner's manual)\n3. Raise the vehicle until the flat tire is 3-4 inches off the ground\n4. Remove the lug nuts completely and pull off the flat tire\n5. Mount the spare tire and hand-tighten the lug nuts in a star pattern\n6. Lower the vehicle and tighten the lug nuts fully\n\n**Important**: Spare tires (especially compact "donut" spares) are temporary. Drive under 80 km/h and replace them within 100 km.`,
      },
      {
        heading: 'When to Call a Mechanic Instead',
        content: `Call a mobile mechanic instead of attempting it yourself if:\n\n- You don't have a spare tire or the spare is flat\n- You're on a highway or busy road where it's unsafe to work\n- The lug nuts are rusted or stuck tight\n- You have a run-flat tire (these require special handling)\n- More than one tire is flat\n- You're physically unable to operate the jack safely\n- It's dark, raining, or in an isolated area\n\nA mobile mechanic can reach you with the right equipment and get you moving again safely.`,
      },
      {
        heading: 'Repair vs. Replace: How to Decide',
        content: `**A tire can usually be repaired if:**\n- The puncture is in the tread area (not the sidewall)\n- The hole is smaller than 6mm in diameter\n- There's only one puncture\n- The tire hasn't been driven on while completely flat for a long distance\n\n**The tire must be replaced if:**\n- The damage is on the sidewall\n- The puncture is larger than 6mm\n- The tire has been run flat for more than 1-2 km\n- The tread depth is below 1.6mm\n- There are multiple punctures or previous repairs nearby\n\nA tire repair typically costs 200-500 INR, while a new tire ranges from 2,000-10,000+ INR depending on size and brand.`,
      },
    ],
  },
  {
    slug: 'car-battery-dead-jump-start',
    title: 'Dead Car Battery: Signs, Jump Starting, and When to Replace',
    description: 'How to identify a dead battery, safely jump start your car, and know when it\'s time for a battery replacement.',
    keywords: 'dead battery, car won\'t start, jump start, battery replacement, car battery near me, battery jump start',
    category: 'emergency',
    readTime: 5,
    date: '2025-12-20',
    sections: [
      {
        heading: 'Signs Your Battery Is Dying',
        content: `Watch for these warning signs before your battery dies completely:\n\n- **Slow engine crank**: The engine turns over sluggishly when starting\n- **Dim headlights**: Noticeably dimmer, especially at idle\n- **Dashboard battery light**: The battery-shaped warning light stays on\n- **Electrical issues**: Power windows move slowly, radio resets\n- **Clicking sound when turning the key**: Not enough charge to engage the starter\n- **Swollen battery case**: Heat damage has warped the casing\n- **Rotten egg smell**: Sulfur smell means the battery is leaking\n\nMost car batteries last 3-5 years. If yours is in that range and showing symptoms, replacement is likely overdue.`,
      },
      {
        heading: 'How to Jump Start a Car Safely',
        content: `If you have jumper cables and a second vehicle:\n\n1. Park both cars close together but not touching, engines off\n2. Connect the **red (+) cable** to the dead battery's positive terminal\n3. Connect the other **red (+) end** to the working battery's positive terminal\n4. Connect the **black (-) cable** to the working battery's negative terminal\n5. Connect the other **black (-) end** to an unpainted metal surface on the dead car (not the battery) — this grounds the connection safely\n6. Start the working car and let it run for 2-3 minutes\n7. Try starting the dead car\n8. Disconnect cables in reverse order\n\n**Safety tips**: Never connect negative to negative on a dead battery (spark risk). Don't jump a frozen, cracked, or leaking battery. After jump starting, drive for at least 20 minutes to recharge.`,
      },
      {
        heading: 'When to Replace vs. Recharge',
        content: `**Recharge if:**\n- You left the lights or accessories on overnight (one-time drain)\n- The battery is less than 2 years old\n- A multimeter reads 12.0-12.4V (low but recoverable)\n\n**Replace if:**\n- The battery is 4+ years old\n- It dies repeatedly even after charging\n- A multimeter reads below 12.0V\n- The case is swollen, cracked, or leaking\n- Terminals are heavily corroded even after cleaning\n\nA car battery replacement typically costs 3,000-8,000 INR including the battery and installation. A mobile mechanic can test your battery on-site and replace it at your location if needed.`,
      },
    ],
  },
  {
    slug: 'engine-overheating-causes-solutions',
    title: 'Engine Overheating: Causes, What to Do, and How to Prevent It',
    description: 'Learn why engines overheat, how to respond safely when the temperature gauge spikes, and preventive measures to avoid costly damage.',
    keywords: 'engine overheating, car overheating, temperature gauge high, coolant leak, radiator problem, engine overheat what to do',
    category: 'emergency',
    readTime: 6,
    date: '2025-12-25',
    sections: [
      {
        heading: 'Why Engines Overheat',
        content: `The most common causes of engine overheating:\n\n- **Low coolant level**: Leaks, evaporation, or never being topped up\n- **Failed thermostat**: Stuck closed, preventing coolant circulation\n- **Broken water pump**: The pump stops circulating coolant through the engine\n- **Radiator problems**: Clogged fins, leaking core, or a failed radiator fan\n- **Blown head gasket**: Coolant leaks into the combustion chamber\n- **Blocked hoses**: Collapsed or clogged coolant hoses\n- **Extreme conditions**: Heavy traffic in hot weather with AC on maximum\n\nModern engines run at 90-105°C normally. The danger zone starts above 110°C.`,
      },
      {
        heading: 'What to Do When Your Engine Overheats',
        content: `**Immediately:**\n1. Turn off the AC and turn the heater to maximum — this pulls heat away from the engine\n2. If the temperature keeps rising, pull over safely and turn off the engine\n3. **Do NOT open the hood or radiator cap** — wait at least 15-20 minutes for pressure to drop\n4. Pop the hood latch from inside to help heat escape\n\n**After cooling:**\n1. Check the coolant reservoir — if it's empty, you likely have a leak\n2. If you have water or coolant, carefully add it to the reservoir (not the radiator cap while hot)\n3. Start the engine and watch the temperature gauge\n\n**Warning**: Driving with an overheating engine even for a few minutes can cause thousands of rupees in damage — warped cylinder heads, blown gaskets, or a seized engine.`,
      },
      {
        heading: 'Preventing Overheating',
        content: `Keep your engine cool with these habits:\n\n- **Check coolant levels monthly** — top up when low, use the correct type\n- **Flush the cooling system** every 2 years or 40,000 km\n- **Inspect hoses and belts** for cracks, swelling, or soft spots\n- **Keep the radiator clean** — bugs and debris block airflow\n- **Watch the temperature gauge** — catch problems early\n- **Service the water pump** when replacing the timing belt (they often share the same drive)\n\nIf your car frequently runs hot, have a mechanic pressure-test the cooling system to find hidden leaks.`,
      },
    ],
  },
  {
    slug: 'brake-warning-signs',
    title: '7 Brake Warning Signs You Should Never Ignore',
    description: 'Recognize the early signs of brake problems before they become dangerous. Learn what squealing, grinding, and soft pedals mean.',
    keywords: 'brake warning signs, brake noise, squealing brakes, grinding brakes, brake pad replacement, brake repair, brake service near me',
    category: 'scheduled',
    readTime: 5,
    date: '2026-01-05',
    sections: [
      {
        heading: 'Squealing or Squeaking When Braking',
        content: `A high-pitched squeal when you press the brake pedal is the most common early warning sign. Most brake pads have a small metal tab called a **wear indicator** that contacts the rotor when the pad is nearly worn out, creating that distinctive squeal.\n\n**What to do**: Schedule a brake inspection soon. You typically have 500-1,000 km of driving left, but don't push it. Continuing to drive on worn pads leads to rotor damage, which is significantly more expensive to fix.\n\nNote: New brake pads can also squeal for the first few hundred km while they bed in — this is normal.`,
      },
      {
        heading: 'Grinding or Growling Sounds',
        content: `If the squeal has turned into a grinding or growling noise, the brake pads are completely worn through and metal is scraping against metal. This is:\n\n- **Dangerous**: Braking distance increases dramatically\n- **Expensive if ignored**: The rotors are being destroyed and will need replacement\n- **Urgent**: Get this fixed immediately — don't drive further than necessary\n\nGrinding brakes typically mean you'll need new pads AND rotors, roughly doubling the repair cost compared to catching it at the squealing stage.`,
      },
      {
        heading: 'Soft or Spongy Brake Pedal',
        content: `If the brake pedal feels soft, sinks to the floor, or requires more pressure than usual:\n\n- **Air in the brake lines**: Needs bleeding\n- **Brake fluid leak**: Check for fluid under the car or around wheels\n- **Worn master cylinder**: The primary component that creates hydraulic pressure\n- **Brake fluid is old**: Absorbs moisture over time, reducing effectiveness\n\n**This is a critical safety issue**. If the pedal goes all the way to the floor, use the handbrake gently and get the car towed — don't drive it.`,
      },
      {
        heading: 'Car Pulls to One Side When Braking',
        content: `If your car veers left or right when you brake:\n\n- **Uneven brake pad wear**: One side is gripping more than the other\n- **Stuck caliper**: A caliper isn't releasing properly\n- **Contaminated brake pad**: Oil or fluid on one pad reduces grip\n- **Uneven rotor wear**: Thickness variation causes inconsistent braking\n\nThis makes the car unpredictable in emergency stops and should be checked promptly.`,
      },
      {
        heading: 'Vibration or Pulsation When Braking',
        content: `A vibration through the brake pedal or steering wheel during braking usually indicates **warped rotors**. Rotors warp from:\n\n- Excessive heat (heavy braking or riding the brakes downhill)\n- Improper lug nut tightening\n- Age and wear\n\nMild warping can sometimes be fixed by machining (resurfacing) the rotors. Severe warping requires replacement.`,
      },
      {
        heading: 'Burning Smell While Driving',
        content: `A sharp, chemical burning smell while braking can indicate:\n\n- **Overheated brakes**: Common after hard braking on steep descents\n- **Stuck caliper**: Creating constant friction even when you're not braking\n- **Dragging handbrake**: Check that it's fully released\n\nPull over and let the brakes cool. If a wheel hub is hot to the touch (don't touch directly), a caliper may be stuck. Call a mechanic.`,
      },
      {
        heading: 'When to Get Brakes Serviced',
        content: `**General guidelines:**\n- Brake pads: Replace every 30,000-70,000 km depending on driving style\n- Rotors: Replace every 50,000-100,000 km or when below minimum thickness\n- Brake fluid: Flush every 2 years regardless of mileage\n\nCity driving wears brakes faster than highway driving. If you drive in heavy traffic daily, inspect your brakes every 15,000 km.\n\nA mobile mechanic can inspect your brakes at your home or office and give you an honest assessment of remaining life.`,
      },
    ],
  },
  {
    slug: 'oil-change-guide',
    title: 'Oil Change: How Often, What Type, and Why It Matters',
    description: 'Everything you need to know about engine oil changes — intervals, oil types, warning signs, and what happens if you skip them.',
    keywords: 'oil change, engine oil, when to change oil, oil change near me, synthetic oil, oil change interval, car service',
    category: 'scheduled',
    readTime: 5,
    date: '2026-01-15',
    sections: [
      {
        heading: 'Why Oil Changes Matter',
        content: `Engine oil does four critical jobs:\n\n1. **Lubricates** moving parts to reduce friction and wear\n2. **Cools** engine components that the coolant system doesn't reach\n3. **Cleans** by carrying away soot, metal particles, and combustion byproducts\n4. **Seals** tiny gaps between pistons and cylinder walls\n\nOver time, oil breaks down, gets contaminated, and loses its ability to do these jobs. Running on old oil accelerates engine wear, reduces fuel efficiency, and can lead to catastrophic engine failure.`,
      },
      {
        heading: 'How Often Should You Change Oil',
        content: `Modern guidelines:\n\n| Oil Type | Interval |\n|----------|----------|\n| Mineral oil | Every 5,000 km or 3 months |\n| Semi-synthetic | Every 7,500 km or 6 months |\n| Full synthetic | Every 10,000-15,000 km or 12 months |\n\n**Change more frequently if you:**\n- Drive mostly in city stop-and-go traffic\n- Make frequent short trips (engine doesn't fully warm up)\n- Drive in dusty or hot conditions\n- Tow heavy loads\n- Drive an older vehicle with higher mileage\n\nAlways follow your vehicle manufacturer's recommendation in the owner's manual — it accounts for your specific engine design.`,
      },
      {
        heading: 'Choosing the Right Oil',
        content: `**Viscosity grade** (e.g., 5W-30, 10W-40):\n- The first number (5W, 10W) = cold-weather flow. Lower is better for cold starts\n- The second number (30, 40) = high-temperature viscosity. Higher provides better protection in heat\n\n**For most Indian cars:**\n- 5W-30 or 5W-40 for modern engines\n- 10W-40 for older engines or hot climates\n- 15W-40 for diesel engines\n\n**Mineral vs. Synthetic**: Synthetic costs 2-3x more but lasts 2-3x longer, protects better at extreme temperatures, and flows better at startup. For most drivers, semi-synthetic is the sweet spot of cost and protection.`,
      },
      {
        heading: 'Signs You Need an Oil Change Now',
        content: `Don't wait for the mileage interval if you notice:\n\n- **Dark, gritty oil on the dipstick**: Fresh oil is amber and translucent\n- **Engine is louder than usual**: Increased ticking or knocking at idle\n- **Oil change / check engine light**: Don't ignore dashboard warnings\n- **Exhaust smoke**: Blue or grey smoke suggests oil is burning\n- **Oil smell inside the car**: Possible leak onto hot engine components\n- **Decreased fuel efficiency**: Dirty oil increases engine friction\n\nChecking your oil takes 30 seconds: pull the dipstick, wipe it, reinsert it, and check the level and color.`,
      },
    ],
  },
  {
    slug: 'car-ac-not-cooling',
    title: 'Car AC Not Cooling? Common Causes and Fixes',
    description: 'Troubleshoot why your car\'s air conditioning isn\'t cold enough. Learn about refrigerant, compressor issues, and when to get it serviced.',
    keywords: 'car ac not cooling, ac not cold, car ac repair, ac gas refill, ac compressor, car ac service near me',
    category: 'scheduled',
    readTime: 5,
    date: '2026-02-01',
    sections: [
      {
        heading: 'Why Your Car AC Stops Cooling',
        content: `The most common reasons your AC blows warm air:\n\n- **Low refrigerant (AC gas)**: The most frequent cause. Refrigerant leaks gradually through fittings and seals\n- **Failed compressor**: The heart of the AC system — if it stops, nothing cools\n- **Clogged condenser**: The condenser (in front of the radiator) gets blocked by debris\n- **Faulty blower motor**: Air doesn't circulate even though the cooling system works\n- **Electrical issues**: Blown fuse, bad relay, or damaged wiring\n- **Blocked cabin air filter**: Restricts airflow into the cabin\n- **Leaking evaporator**: Refrigerant escapes from the evaporator inside the dashboard`,
      },
      {
        heading: 'Quick Checks You Can Do Yourself',
        content: `Before calling a mechanic, check:\n\n1. **Cabin air filter**: Located behind the glove box in most cars. If it's clogged with dust, replace it (costs 200-500 INR)\n2. **AC settings**: Make sure you're on recirculation mode (not fresh air) for maximum cooling\n3. **Engine temperature**: An overheating engine can affect AC performance\n4. **Compressor clutch**: With AC on, look at the compressor pulley — the center should be spinning. If only the outer ring spins, the clutch isn't engaging\n5. **Condenser**: Look through the front grille — if the condenser is clogged with leaves or bugs, clean it with a gentle water spray`,
      },
      {
        heading: 'AC Gas Refill: What to Know',
        content: `**How often**: AC systems shouldn't need regular refills. If you need a refill, you likely have a leak that should be found and fixed.\n\n**Cost**: AC gas refill typically costs 1,500-3,000 INR depending on the refrigerant type (R134a or R1234yf for newer cars).\n\n**Warning signs of low gas:**\n- AC blows cool but not cold\n- Cooling is fine at highway speeds but weak at idle\n- Visible ice formation on AC components under the hood\n\n**Don't just refill**: A mechanic should check for leaks using a UV dye test or electronic leak detector before refilling. Otherwise you'll be back in a few months with the same problem.`,
      },
      {
        heading: 'When to Get Professional AC Service',
        content: `Call a mechanic if:\n\n- The AC blows completely warm air\n- You hear clicking or grinding when AC is turned on\n- There's a musty smell from the vents (mold in the evaporator)\n- The AC works intermittently\n- The system was last serviced more than 2 years ago\n\nA full AC service includes leak testing, refrigerant check, compressor inspection, cabin filter replacement, and evaporator cleaning. Budget 2,000-5,000 INR for a complete service.`,
      },
    ],
  },
  {
    slug: 'strange-car-noises-diagnosis',
    title: 'Strange Car Noises: What They Mean and How Serious They Are',
    description: 'A guide to diagnosing common car noises — squealing, grinding, knocking, hissing, and clicking — and understanding urgency levels.',
    keywords: 'car making noise, car squealing, grinding noise car, knocking sound engine, car clicking noise, car noise diagnosis',
    category: 'emergency',
    readTime: 6,
    date: '2026-02-10',
    sections: [
      {
        heading: 'Squealing from the Engine Bay',
        content: `**Sound**: High-pitched squeal or screech, especially at startup or when turning the steering wheel.\n\n**Likely causes:**\n- **Worn serpentine/drive belt**: The belt that drives your alternator, AC, and power steering. Most common cause\n- **Belt tensioner failing**: Can't maintain proper belt tension\n- **Power steering pump low on fluid**: Especially if it squeals during turns\n\n**Urgency**: Medium. A snapped belt will leave you stranded with no charging, no AC, and no power steering. Get it checked within a week.`,
      },
      {
        heading: 'Grinding When Braking',
        content: `**Sound**: Metal-on-metal grinding, growling, or scraping when pressing the brake pedal.\n\n**Likely causes:**\n- **Worn brake pads**: The pad material is gone, and the backing plate is grinding the rotor\n- **Debris stuck in caliper**: A small rock or piece of metal caught between pad and rotor\n\n**Urgency**: High. Your stopping distance is compromised. Don't drive further than necessary — get brakes inspected immediately.`,
      },
      {
        heading: 'Knocking or Pinging from the Engine',
        content: `**Sound**: A metallic knocking, pinging, or rattling from inside the engine, especially under acceleration.\n\n**Likely causes:**\n- **Low-quality or wrong fuel**: Using lower octane than recommended\n- **Carbon buildup**: Deposits in combustion chamber cause pre-ignition\n- **Worn rod bearings**: A deep, rhythmic knock that gets louder with RPM\n- **Low oil level or pressure**: Metal components aren't properly lubricated\n\n**Urgency**: Fuel-related pinging is low urgency (use correct fuel). Rod bearing knock is critical — continued driving can destroy the engine. If the knock is rhythmic and worsens with engine speed, stop driving.`,
      },
      {
        heading: 'Hissing Under the Hood',
        content: `**Sound**: Continuous or intermittent hissing from the engine bay.\n\n**Likely causes:**\n- **Coolant leak onto hot engine**: The most common hissing source\n- **Vacuum leak**: A cracked or disconnected vacuum hose\n- **Exhaust leak**: A crack in the exhaust manifold\n- **Overheating**: Steam escaping from the cooling system\n\n**Urgency**: Medium to high. A coolant leak will lead to overheating. A vacuum leak causes poor performance and fuel economy. Check your coolant level and look for wet spots or steam.`,
      },
      {
        heading: 'Clicking When Starting',
        content: `**Sound**: Rapid clicking or a single loud click when turning the key, but the engine doesn't start.\n\n**Likely causes:**\n- **Dead or weak battery**: The most common cause by far\n- **Corroded battery terminals**: Preventing proper electrical contact\n- **Failed starter motor**: The starter solenoid or motor itself\n- **Bad ground connection**: A loose or corroded ground cable\n\n**Urgency**: You're not going anywhere until this is fixed. Try jump-starting first. If that works, get the battery tested. If jump-starting doesn't help, call a mechanic — likely a starter issue.`,
      },
      {
        heading: 'Rumbling or Roaring While Driving',
        content: `**Sound**: A constant rumbling, roaring, or humming that changes with vehicle speed (not engine speed).\n\n**Likely causes:**\n- **Worn wheel bearing**: The rumble changes when turning (louder one direction, quieter the other)\n- **Tire noise**: Uneven wear, low pressure, or aggressive tread pattern\n- **Exhaust leak**: A hole or crack in the muffler or exhaust pipe\n\n**Urgency**: A worn wheel bearing is medium-high urgency — it will eventually seize, which can lock the wheel while driving. Get it checked within a few days. Tire noise is low urgency but check tire condition.`,
      },
    ],
  },
  {
    slug: 'pre-trip-vehicle-checklist',
    title: 'Pre-Trip Vehicle Checklist: 10 Things to Check Before a Long Drive',
    description: 'Don\'t start a road trip without checking these 10 things. A simple inspection can prevent breakdowns and keep you safe on the highway.',
    keywords: 'pre trip checklist, road trip checklist, vehicle inspection, car check before trip, long drive preparation, vehicle safety check',
    category: 'scheduled',
    readTime: 5,
    date: '2026-02-20',
    sections: [
      {
        heading: 'Tires: Pressure, Tread, and Spare',
        content: `**Check all four tires plus the spare:**\n\n- **Pressure**: Use a gauge to check cold tire pressure (before driving). The correct PSI is on the driver's door jamb sticker, not on the tire sidewall\n- **Tread depth**: Insert a 1-rupee coin into the tread. If you can see the top of the coin's design, the tire needs replacing\n- **Condition**: Look for cracks, bulges, or nails/screws embedded in the tread\n- **Spare tire**: Check that it's inflated and that you have a jack and lug wrench\n\nUnderinfated tires increase blowout risk at highway speeds and reduce fuel efficiency by up to 3%.`,
      },
      {
        heading: 'Engine Oil and Fluids',
        content: `Check these fluid levels:\n\n- **Engine oil**: Should be between the min and max marks on the dipstick, amber-ish in color\n- **Coolant**: Check the overflow reservoir when the engine is cold. Top up if low\n- **Brake fluid**: In the transparent reservoir under the hood. Should be above the MIN line\n- **Windshield washer fluid**: Top up fully — you'll need it on dusty highway drives\n- **Power steering fluid**: Check if your car has hydraulic (not electric) steering\n\nIf any fluid is significantly low, find and fix the cause before your trip.`,
      },
      {
        heading: 'Brakes',
        content: `Test your brakes before you leave:\n\n- Press the brake pedal — it should feel firm, not spongy or sinking\n- Brake at moderate speed — the car should stop straight without pulling or vibrating\n- Listen for squealing, grinding, or unusual sounds\n- Check that the handbrake holds the car on a slope\n\nIf anything feels off, get brakes inspected before the trip. Highway braking demands much more from your brakes than city driving.`,
      },
      {
        heading: 'Lights and Signals',
        content: `Walk around the car and check every light:\n\n- Headlights (low and high beam)\n- Tail lights and brake lights (have someone press the pedal while you check)\n- Turn signals (all four corners)\n- Hazard lights\n- Reverse lights\n- Fog lights (if equipped)\n\nA burned-out tail light or turn signal is both a safety risk and an invitation for a traffic fine.`,
      },
      {
        heading: 'Battery and Electrical',
        content: `- **Battery terminals**: Should be clean, tight, and free of white/green corrosion\n- **Battery age**: If it's over 3 years old, consider getting it tested before a long trip\n- **Charging system**: If your headlights dim at idle, the alternator might be weak\n- **Phone charger**: Ensure your car charger works — your phone is your GPS, emergency call, and entertainment system on a road trip`,
      },
      {
        heading: 'Emergency Kit',
        content: `Pack these items:\n\n- **First aid kit** with basic supplies\n- **Reflective warning triangles** or flares\n- **Flashlight** with fresh batteries\n- **Basic tools**: Wrench set, screwdrivers, pliers, electrical tape\n- **Jumper cables** or a portable jump starter\n- **Water**: At least 2 liters for the car (coolant top-up) and drinking water\n- **Phone numbers**: Roadside assistance, insurance, and a trusted mechanic\n\nHaving these items turns a potential disaster into a minor inconvenience.`,
      },
    ],
  },
  {
    slug: 'when-to-call-mechanic-vs-diy',
    title: 'When to Call a Mechanic vs. Fix It Yourself: A Practical Guide',
    description: 'Know which car problems you can safely handle yourself and which ones require a professional mechanic. Save money without risking safety.',
    keywords: 'when to call mechanic, DIY car repair, car problems fix yourself, mobile mechanic when needed, car repair guide',
    category: 'scheduled',
    readTime: 6,
    date: '2026-03-01',
    sections: [
      {
        heading: 'Safe DIY: Things You Can Do Yourself',
        content: `These tasks are straightforward and require minimal tools:\n\n- **Replace wiper blades**: Pull the old ones off, clip the new ones on. 10 minutes\n- **Top up fluids**: Windshield washer, coolant (when cold), engine oil between changes\n- **Change cabin air filter**: Usually behind the glove box, no tools needed\n- **Replace a blown fuse**: Check the fuse box diagram, swap with the correct amp rating\n- **Change a flat tire**: If you have a spare, jack, and safe location\n- **Clean battery terminals**: Baking soda, water, and a wire brush\n- **Replace headlight bulbs**: Most are accessible from behind the headlight assembly\n- **Check and adjust tire pressure**: With a simple pressure gauge at any petrol station\n\n**Total cost savings**: These tasks would cost 500-2,000 INR each at a shop.`,
      },
      {
        heading: 'Maybe DIY: Depends on Your Comfort Level',
        content: `These require some mechanical knowledge and basic tools:\n\n- **Replace brake pads**: Straightforward but safety-critical. If you've never done it, watch a tutorial for your specific car first\n- **Change engine oil and filter**: Messy but simple. Need a jack, drain pan, and correct oil/filter\n- **Replace spark plugs**: Easy on 4-cylinder engines, harder on V6/V8 where some plugs are buried\n- **Replace a serpentine belt**: Need to know the routing diagram and have the correct belt\n- **Replace an air filter**: Usually simple, but some engine bays make it awkward\n\n**The rule**: If you can watch a YouTube tutorial for YOUR specific car model and it looks doable, go for it. If not, call a mechanic.`,
      },
      {
        heading: 'Always Call a Mechanic',
        content: `**Never DIY these** unless you're a trained mechanic:\n\n- **Brake system bleeding or master cylinder work**: Air in brake lines = brake failure\n- **Engine timing belt/chain replacement**: Get it wrong and the engine self-destructs\n- **Transmission work**: Extremely complex and easy to make expensive mistakes\n- **Suspension and steering components**: Safety-critical alignment and torque specs\n- **Electrical diagnostics**: Modern cars have complex wiring. Random troubleshooting can cause more damage\n- **AC system work**: Requires specialized equipment to handle refrigerant safely\n- **Airbag-related work**: Airbags can deploy unexpectedly during repair, causing serious injury\n- **Anything with the fuel system**: Fire and explosion risk\n\n**The principle**: If a mistake could result in injury, death, or damage exceeding the repair cost, hire a professional.`,
      },
      {
        heading: 'How a Mobile Mechanic Saves You Time and Money',
        content: `Traditional shop vs. mobile mechanic:\n\n| Factor | Traditional Shop | Mobile Mechanic |\n|--------|-----------------|----------------|\n| Travel | You drive there and wait | They come to you |\n| Time | Half-day minimum with commute | 30-90 min at your location |\n| Overhead | Higher shop rent = higher prices | Lower overhead, competitive rates |\n| Transparency | Car disappears behind a wall | Watch the work happen |\n| Convenience | Take time off work | Get it fixed at home or office |\n\nFor most routine services (oil changes, brake pads, battery replacement, diagnostics), a mobile mechanic is faster, often cheaper, and more transparent than a shop visit.\n\nWith Mobile Mechanic, you can find a verified mechanic near you, see their ratings, and book instantly — no phone tag, no driving across town.`,
      },
    ],
  },
];

export default articles;
