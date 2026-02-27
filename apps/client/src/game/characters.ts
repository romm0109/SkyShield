import bibiImage from "../assets/players/bibi.png";
import supermanIsraelImage from "../assets/players/superman_israel.png";
import supermanUsaImage from "../assets/players/superman_usa.png";
import trumpImage from "../assets/players/trump.png";

export interface CharacterOption {
  id: string;
  label: string;
  imageSrc: string;
}

export const CHARACTER_OPTIONS: CharacterOption[] = [
  { id: "bibi", label: "Bibi", imageSrc: bibiImage },
  { id: "superman_israel", label: "Superman Israel", imageSrc: supermanIsraelImage },
  { id: "superman_usa", label: "Superman USA", imageSrc: supermanUsaImage },
  { id: "trump", label: "Trump", imageSrc: trumpImage }
];

export const DEFAULT_CHARACTER_ID = CHARACTER_OPTIONS[0]?.id ?? "bibi";

const CHARACTER_BY_ID = new Map(CHARACTER_OPTIONS.map((character) => [character.id, character]));

export function isValidCharacterId(value: string): boolean {
  return CHARACTER_BY_ID.has(value.trim());
}

export function getCharacterById(value: string): CharacterOption | undefined {
  return CHARACTER_BY_ID.get(value.trim());
}

