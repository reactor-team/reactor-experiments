export interface Prompt {
  id: string;
  title: string;
  prompt: string;
}

export const presetPrompts: Prompt[] = [
  {
    id: "reactor-museum",
    title: "Reactor Museum",
    prompt:
      'A slow rotating camera shot inside a large New York museum gallery. In the center of the room stands a towering stack of vintage CRT televisions arranged in a tall, slightly chaotic structure. The televisions are from the 1950s\u20131970s, with worn edges, thick frames, knobs, and curved glass screens.\n\nEvery single television screen displays the same word: "REACTOR".\nThe word REACTOR appears in large, bold, clear capital letters centered on each screen. No other content appears on the televisions \u2014 all TVs show only the word "REACTOR".\n\nThe glowing CRT screens cast nostalgic light across the gallery. The background contains other vintage museum exhibits and artifacts in soft focus, reinforcing the historical atmosphere. The room is dimly lit except for the warm glow from the stacked televisions.\n\nWide-angle cinematic shot capturing the entire tower of televisions and the surrounding gallery space, realistic reflections on CRT glass, retro museum aesthetic, high detail, slow rotating camera movement.',
  },
  {
    id: "cyberpunk-atlantis",
    title: "Cyberpunk Atlantis",
    prompt:
      'A surreal and dreamlike scene in the style of a cyberpunk film, depicting New York City submerged underwater, resembling the mythical city of Atlantis. Fish, whales, sea turtles, and sharks swim through the bustling streets, which now resemble underwater landscapes. The buildings are partially submerged, their facades covered in algae and marine growth. The water is murky and filled with sunlight filtering through from above, casting colorful hues. Pedestrians, now merfolk, move gracefully through the water, interacting with the aquatic creatures. On the side of one of the submerged skyscrapers, a large mosaic reads "REACTOR" in glowing bioluminescent tiles, visible through the murky water. The camera angle is from a low, sweeping shot, capturing the vast expanse of this submerged metropolis.',
  },
  {
    id: "vintage-tv-museum",
    title: "Vintage TV Museum",
    prompt:
      'A rotating camera view inside a large New York museum gallery, showcasing a towering stack of vintage televisions, each displaying different programs from the 1950s and 1970s. The televisions show a mix of 1950s sci-fi movies, horror films, news broadcasts, static, and a 1970s sitcom. Among all the screens, one television in the middle of the stack shows only the word "REACTOR" in bold white letters on a black screen \u2014 like a station ID card. The gallery space is filled with the nostalgic glow of the old TV screens, their edges worn and frames aged. The background features other vintage exhibits and artifacts, adding to the historical ambiance. The televisions are arranged in a dynamic, almost chaotic pattern, creating a sense of visual interest and movement. A wide-angle shot capturing the entire stack and the surrounding gallery space.',
  },
  {
    id: "underwater-piano",
    title: "Underwater Piano",
    prompt:
      'An underwater photograph in a clear and tranquil lake, capturing a person playing a grand piano. The water is crystal clear, allowing visibility to the bottom where aquatic plants and rocks create a natural, serene backdrop. The person, likely wearing a diving suit, has a focused and serene expression as they play the piano, their fingers gracefully moving over the keys. The piano itself appears old but well-maintained, with a rich wooden finish \u2014 and on the fallboard, the word "REACTOR" is inlaid in subtle mother-of-pearl lettering. The camera angle is slightly above the person, providing a clear view of both the pianist and the beautiful underwater scenery. The photo has a soft, almost dreamlike quality, emphasizing the harmony between the human and nature. A medium shot from a slightly elevated angle.',
  },
  {
    id: "misty-forest",
    title: "Misty Forest",
    prompt:
      'A sweeping panoramic view pans left through a tranquil, mist-covered forest, with rays of sunlight piercing through the dense canopy and casting dappled light on the forest floor. The camera captures the serene environment, with tall evergreen trees towering overhead and their silhouettes partially obscured by the mist. The rays of sunlight filtering through the canopy arrange themselves to spell out the word "REACTOR" in glowing golden light across the sky above the treeline, visible through gaps in the canopy. Faint streams and patches of wildflowers add to the natural beauty of the scene. The background gradually fades into a soft, hazy distance, emphasizing the peacefulness of the forest. A wide-angle shot with a gentle camera movement.',
  },
  {
    id: "tokyo-train",
    title: "Tokyo Train Window",
    prompt:
      'A detailed digital painting in the style of a realistic Japanese manga, capturing reflections in the window of a train traveling through the Tokyo suburbs. The train moves smoothly, passing through lush green fields and dense forests. Outside the window, the scenery blurs into a series of vivid colors \u2014 emerald greens, deep browns, and vibrant yellows. Outside the train window, a massive illuminated billboard dominates the view as it passes \u2014 it fills a large portion of the window frame and displays only the word "REACTOR" in enormous, bright neon letters against a jet black background. The billboard is the most prominent element visible through the window, glowing vividly against the evening suburban landscape. Inside the train, a young woman with long black hair and traditional Japanese clothing sits with a contemplative expression, gazing out the window. Her kimono is adorned with intricate patterns, and she wears a simple obi sash tied neatly. The train cabin is dimly lit, with soft shadows playing across the wooden seats. The background features a blurred yet recognizable landscape, with hints of Tokyo skyscrapers and cherry blossoms in the distance. A medium shot from a slightly tilted angle, emphasizing the reflection and the woman\'s serene expression.',
  },
  {
    id: "viking-bus",
    title: "Viking Bus Driver",
    prompt:
      'A Viking warrior driving a modern city bus filled with passengers. The Viking has long blonde hair tied back, a beard, and is adorned with a fur-lined helmet and armor. He wears a traditional tunic and trousers, but also sports a seatbelt as he focuses on navigating the busy streets. Pinned to his chest armor is an official bus driver badge that reads "REACTOR DRIVER" in bold printed letters. The interior of the bus is typical, with rows of seats occupied by diverse passengers going about their daily routines \u2014 none of them seeming to notice anything unusual. The exterior shots show the bustling urban environment, including tall buildings and traffic. Medium shot focusing on the Viking at the wheel, with occasional close-ups of his determined expression.',
  },
  {
    id: "stone-cottage",
    title: "Stone Cottage",
    prompt:
      'A small stone cottage nestled between two hills, smoke curling gently from its chimney. Above the wooden door, carved into the lintel stone in neat weathered letters, is the word "REACTOR".',
  },
];
