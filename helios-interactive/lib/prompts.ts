export interface StoryPrompt {
  id: string;
  title: string;
  prompt: string;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  theme: string;
  startPrompt: StoryPrompt;
  followUps: StoryPrompt[];
}

export const stories: Story[] = [
  {
    id: "jungle-king",
    title: "King of the Jungle",
    description: "Follow Leo the lion through the jungle",
    theme: "from-amber-900 to-yellow-900",
    startPrompt: {
      id: "leo-0",
      title: "Leo Appears",
      prompt:
        "A majestic lion named Leo stands regally in the heart of a dense jungle, embodying the essence of a king. Leo has a golden mane that flows gracefully around his broad shoulders, and his piercing amber eyes survey the landscape with confidence and authority. He is positioned on a rocky outcrop, towering over the lush greenery below. The background showcases a vibrant jungle scene with tall trees, cascading vines, and dappled sunlight filtering through the canopy. Leo's posture is proud and commanding, with his tail held high. The scene is captured from a medium close-up perspective, emphasizing Leo's powerful stance and the regal aura surrounding him.",
    },
    followUps: [
      {
        id: "leo-1",
        title: "Leo Roars",
        prompt:
          "Leo shifts his powerful weight slightly on the rocky outcrop, his golden mane rippling as he does so. Suddenly, he opens his massive jaws to release a deep, resonant roar that vibrates through the humid air, revealing his formidable white teeth. The dappled sunlight filtering through the canopy dances across his fur as his chest expands with the effort. The vibrant jungle remains lush and green around him, with tall trees and cascading vines framing his commanding figure. A medium close-up perspective emphasizing Leo's powerful stance and the regal aura surrounding him.",
      },
      {
        id: "leo-2",
        title: "Leo Meets a Butterfly",
        prompt:
          "Leo maintains his regal position on the rocky outcrop as the humid jungle air settles around his broad shoulders. He suddenly lowers his massive head to sniff a vibrant blue butterfly that has fluttered near his nose, his piercing amber eyes momentarily softening with curiosity. The dappled sunlight continues to filter through the tall trees and cascading vines, illuminating the golden hues of his mane against the lush green background. His tail remains held high, a symbol of his enduring authority over the landscape. A medium close-up perspective emphasizing Leo's powerful stance and the regal aura surrounding him.",
      },
      {
        id: "leo-3",
        title: "Leo Yawns",
        prompt:
          "Leo stretches his massive body across the rocky outcrop in the heart of the dense jungle, his golden mane spreading wide as he extends his powerful front legs forward. He opens his enormous jaws in a wide, lazy yawn, revealing rows of formidable white teeth and a deep pink tongue curling upward. His piercing amber eyes squeeze shut momentarily with the effort as dappled sunlight filters through the canopy, warming his golden fur. The lush greenery of tall trees and cascading vines surrounds his relaxed form. A medium close-up perspective emphasizing Leo's powerful stance and the regal aura surrounding him.",
      },
      {
        id: "leo-4",
        title: "Leo Spots a Parrot",
        prompt:
          "Leo remains on the rocky outcrop in the heart of the dense jungle, his golden mane catching the filtered light. He suddenly turns his head sharply to the left, his ears twitching as he focuses on a brightly colored parrot that lands on a nearby branch. His piercing amber eyes lock onto the bird with intense focus, analyzing the new arrival amidst the tall trees and cascading vines. The lush greenery provides a vibrant backdrop as he stands with authority, his posture commanding and proud. A medium close-up perspective emphasizing Leo's powerful stance and the regal aura surrounding him.",
      },
      {
        id: "leo-5",
        title: "Leo Drinks",
        prompt:
          "Leo stands regally on the rocky outcrop in the heart of the dense jungle, his golden mane flowing around his broad shoulders. He dips his head low to lap cool water from a small, clear puddle that has formed in a crevice of the stone, his rough tongue splashing gently. His piercing amber eyes briefly close in satisfaction before reopening to survey the lush greenery, tall trees, and cascading vines. The dappled sunlight filters through the canopy, highlighting the wet fur on his muzzle. A medium close-up perspective emphasizing Leo's powerful stance and the regal aura surrounding him.",
      },
    ],
  },
  {
    id: "rainy-evening",
    title: "Rainy Evening",
    description: "A peaceful moment in the city rain",
    theme: "from-gray-900 to-blue-900",
    startPrompt: {
      id: "rain-0",
      title: "Under the Rain",
      prompt:
        "A young man standing in the rain, looking up at the sky with a warm, inviting smile on his face. He is dressed in a fitted dark jacket and a white t-shirt that clings to his frame as droplets of water fall around him. His hair is gently tousled from the rain, framing his sharp features. The background shows a blurred cityscape with tall buildings and the faint glow of streetlights. The scene captures the serene beauty of a rainy evening. Medium close-up, static shot focusing on the man's face and upper body.",
    },
    followUps: [
      {
        id: "rain-1",
        title: "He Catches Raindrops",
        prompt:
          "The young man remains framed against the soft blur of city lights, the rain now glistening on his skin as he slowly extends his right hand palm-up to catch the falling droplets. His expression shifts slightly to one of quiet wonder as the water pools in his cupped fingers. The dark fabric of his jacket darkens further with the moisture, emphasizing the damp atmosphere. The distant streetlights create bokeh orbs behind his silhouette. Medium close-up, static shot focusing on the man's face and upper body.",
      },
      {
        id: "rain-2",
        title: "A Sparrow Finds Him",
        prompt:
          "The young man in the soaked dark jacket keeps his right hand extended palm-up in the rain. A small sparrow flutters down through the falling droplets and lands gently on his open palm, its tiny feet gripping his wet fingers. He watches the bird with a soft, surprised smile, barely breathing so as not to startle it. The sparrow ruffles its damp feathers and tilts its head, meeting his gaze. Rain continues to fall steadily around them both, with the blurred gray cityscape and warm streetlights glowing behind. Medium close-up, static shot focusing on the man's face and upper body.",
      },
      {
        id: "rain-3",
        title: "Birds Surround Him",
        prompt:
          "The young man in the soaked dark jacket stands still in the rain as dozens of small birds descend from the gray sky, landing on his shoulders, arms, and head. Sparrows and finches perch along both shoulders of his wet jacket, their tiny claws gripping the damp fabric. Several more flutter around him, wings beating against the falling raindrops. He laughs softly with genuine joy, his eyes bright as the birds nestle close to him for warmth. The blurred cityscape and warm streetlights glow behind the extraordinary scene. Medium close-up, static shot focusing on the man's face and upper body covered in birds.",
      },
    ],
  },
];
