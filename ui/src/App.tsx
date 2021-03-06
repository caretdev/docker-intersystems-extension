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

const setFlags = (repo: {
  root: string;
  name: string;
  tags: string[];
}): Image => {
  const { root, name, tags } = repo;
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
  const repository = `${REGISTRY}`;
  const publicAccess =
    root === 'intersystems' &&
    (repo.name.includes('-community') ||
      ['passwordhash', 'sam'].includes(repo.name));
  return {
    repository,
    root,
    name,
    fullName: `${REGISTRY}/${root}/${name}`,
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
      root: repo.repository.split('/')[0],
      name: repo.repository.split('/').slice(1).join('/'),
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
  const [showInternal, setShowInternal] = React.useState(false);
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
      setShowInternal(!!images.find((image) => image.root === 'iscinternal'));
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
          setShowInternal(
            !!images.find((image) => image.root === 'iscinternal'),
          );
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
          {showInternal && <Tab label="ISC" value={2} />}
        </Tabs>
        {loading && <LinearProgress />}
        <TabPanel value={value} index={0}>
          <Images
            images={images}
            loaded={loaded}
            kind={'iris'}
            root="intersystems"
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
            root="intersystems"
            onPull={pullImage}
            onDelete={rmImage}
            onCopy={copyToClipboard}
          />
        </TabPanel>
        {showInternal && (
          <TabPanel value={value} index={2}>
            <Images
              images={images}
              loaded={loaded}
              kind={'tools'}
              root="iscinternal"
              onPull={pullImage}
              onDelete={rmImage}
              onCopy={copyToClipboard}
            />
          </TabPanel>
        )}
      </Box>
    </>
  );
}
