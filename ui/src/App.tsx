import * as React from 'react';
import Alert from '@mui/material/Alert';
import TabPanel from './components/TabPanel';
import { Images, Image } from './Images';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { createDockerDesktopClient } from '@docker/extension-api-client';
import { AppBar, IconButton, Snackbar, Toolbar } from '@mui/material';
import { Refresh } from '@mui/icons-material';

const REGISTRY = 'containers.intersystems.com';

interface DockerLSRepository {
  repository: string;
  tags: string[];
}

interface DockerLSResponse {
  repositories: DockerLSRepository[];
}

const setFlags = (repo: { name: string; tags: string[] }): Image => {
  const { name, tags } = repo;
  const arch = repo.name.endsWith('-arm64') ? 'arm64' : 'x64';
  const repoParts = repo.name.split('-');
  const kind =
    repo.name.startsWith('iris') && repo.name !== 'iris-operator'
      ? 'iris'
      : 'tools';
  const edition =
    kind === 'iris'
      ? repoParts.includes('community')
        ? 'community'
        : 'general'
      : 'any';
  const repository = `${REGISTRY}/intersystems`;
  const publicAccess =
    repo.name.includes('-community') ||
    ['passwordhash', 'sam'].includes(repo.name);
  return {
    repository,
    name,
    fullName: `${repository}/${name}`,
    publicAccess,
    tags,
    arch,
    edition,
    kind,
  };
};

const getImages = (data: DockerLSResponse) => {
  return data.repositories
    .map((repo) => ({
      name: repo.repository.split('/')[1],
      tags: repo.tags,
    }))
    .map((repo) => setFlags(repo));
};

let ddClientError = '';
try {
  var ddClient = createDockerDesktopClient();
} catch (err) {
  ddClientError = err.message;
}
let imagesLoaded = false;
let allImages: Image[] = [];
let needUpdateRegistry = !localStorage.hasOwnProperty(REGISTRY);

const copyToClipboard = (value: string) => {
  navigator.clipboard.writeText(value);
  ddClient?.desktopUI?.toast?.success(`${value} copied to clipboard`);
};

interface DockerImage {
  RepoTags: string[];
}

const importData = async (): Promise<Image[]> => {
  if (localStorage.hasOwnProperty(REGISTRY)) {
    return Promise.resolve(
      JSON.parse(localStorage.getItem(REGISTRY) || ''),
    ).then((images) => getImages(images));
  }
  return fetch('all.json')
    .then((res) => res.json())
    .then((images) => getImages(images));
};

const loadRegistry = () => {
  if (ddClient?.extension?.host) {
    return ddClient.extension.host.cli
      .exec('docker-ls', [
        '--registry',
        `https://${REGISTRY}`,
        'repositories',
        '-j',
        '-l',
        '1',
      ])
      .then(({ stdout }) => {
        localStorage.setItem(REGISTRY, stdout);
        return getImages(JSON.parse(stdout));
      });
  }
  return Promise.resolve(allImages);
};

const loadDockerImages = () => {
  if (ddClient?.docker?.listImages) {
    return ddClient.docker.listImages().then((list) => {
      return (list as DockerImage[])
        .filter((el) => el.RepoTags)
        .flatMap((el) => el.RepoTags)
        .filter((el) => el.startsWith(REGISTRY));
    });
  }
  return Promise.resolve([]);
};

export function App() {
  const [value, setValue] = React.useState(0);
  const [errorMsg] = React.useState(ddClientError);
  const [images, setImages] = React.useState<Image[]>(allImages);
  const [loaded, setLoaded] = React.useState<string[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [updateRegistry, setUpdateRegistry] =
    React.useState(needUpdateRegistry);

  if (!allImages.length) {
    importData().then((images) => {
      allImages = images;
      setImages(images);
    });
  }
  if (ddClient?.extension?.host) {
    if (updateRegistry) {
      setLoading(true);
      setUpdateRegistry(false);
      loadRegistry()
        .then((images) => {
          allImages = images;
          setImages(images);
        })
        .catch((err) => {
          ddClient.desktopUI.toast.error(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
    if (!imagesLoaded) {
      imagesLoaded = true;
      loadDockerImages().then((list) => {
        setLoaded(list);
      });
    }
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const pullImage = (image: string, tag: string) => {
    const fullName = `${image}:${tag}`;
    setLoaded([...(loaded || []), fullName]);
    ddClient?.docker.cli
      .exec('pull', [fullName])
      .then(() =>
        ddClient.desktopUI.toast.success(`Docker image ${fullName} pulled`),
      );
  };

  const rmImage = (image: string, tag: string) => {
    const fullName = `${image}:${tag}`;
    setLoaded([...(loaded || []), fullName]);
    ddClient?.docker.cli
      .exec('rm', [fullName])
      .then(() =>
        ddClient.desktopUI.toast.warning(`Docker image ${fullName} deleted`),
      );
  };

  return (
    <>
      <AppBar position="fixed" color="transparent">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            containers.intersystems.com
          </Typography>
          <IconButton
            size="large"
            aria-label="refresh"
            color="inherit"
            onClick={() => setUpdateRegistry(true)}
          >
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box>
        {errorMsg && (
          <Snackbar
            open
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert severity="error">{errorMsg}</Alert>
          </Snackbar>
        )}
        <Toolbar />
        <Tabs value={value} onChange={handleChange}>
          <Tab label="IRIS" value={0} />
          <Tab label="TOOLS" value={1} />
        </Tabs>
        {loading && <LinearProgress />}
        <TabPanel value={value} index={0}>
          <Images
            images={images}
            loaded={loaded}
            kind={'iris'}
            onPull={pullImage}
            onDelete={rmImage}
            onCopy={copyToClipboard}
          />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <Images
            images={images}
            loaded={loaded}
            kind={'tools'}
            onPull={pullImage}
            onDelete={rmImage}
            onCopy={copyToClipboard}
          />
        </TabPanel>
      </Box>
    </>
  );
}
