import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export const ThemeSwitch = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [icon, setIcon] = useState(<IconSun />);

  useEffect(() => {
    setIcon(colorScheme === "dark" ? <IconSun /> : <IconMoonStars />);
  }, [colorScheme]);

  return (
    <ActionIcon
      variant="subtle"
      size="xs"
      onClick={() => toggleColorScheme(colorScheme === "light" ? "dark" : "light")}>
      {icon}
    </ActionIcon>
  );
};
