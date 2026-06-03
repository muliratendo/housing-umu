import { Link, Head } from '@inertiajs/react';
import { useMediaQuery } from '@mantine/hooks';
import { Button, Flex, Stack, Text, useMantineTheme } from '@mantine/core';
import { IconApps, IconDashboard, IconClipboardText } from '@tabler/icons-react';
import classes from './welcome.module.css';
import { PageProps } from '@/types';

export default function Welcome({ laravelVersion }: PageProps<{ laravelVersion: string }>) {
  const theme = useMantineTheme();
  const laptop_match = useMediaQuery('(max-width: 992px)');
  const tablet_match = useMediaQuery('(max-width: 768px)');
  const mobile_match = useMediaQuery('(max-width: 425px)');

  return (
    <>
      <Head title="Laratine Admin | Welcome!" />

      <Stack h="100vh" w="100%" justify={'space-between'} align="center" p={32}>
        <Text></Text>
        <Stack>
          <Flex justify={'center'} align={'center'} gap={12} className={classes.logo}>
            <IconApps size={mobile_match ? 36 : 80} />
            <Text fz={{ base: 28, sm: 60 }} fw={700}>
              Housing@UMU | Laratine Admin Template
            </Text>
          </Flex>
          <Flex justify="center">
            <Button
              variant="subtle"
              leftSection={<IconDashboard size={16} />}
              component={Link}
              href="/admin/dashboard"
            >
              DASHBOARD
            </Button>
            <Button
              component={'a'}
              href="https://booking-umu-project-management.vercel.app/"
              variant="subtle"
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconClipboardText size={16} />}
            >
              PROJECT MANAGEMENT BOARD
            </Button>
            <Button
              variant="subtle"
              leftSection={<IconDashboard size={16} />}
              component={Link}
              href="/dev-login"
            >
              DEV LOGIN
            </Button>
          </Flex>
        </Stack>
        <Text c={theme.primaryColor}>Laravel Version: {laravelVersion}</Text>
      </Stack>
    </>
  );
}
