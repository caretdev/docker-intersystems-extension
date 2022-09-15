import * as React from 'react';
import Alert from '@mui/material/Alert';
import TabPanel from './components/TabPanel';
import { Images, Image, ImageState } from './Images';
import { Help } from './Help';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { createDockerDesktopClient } from '@docker/extension-api-client';
import { AppBar, IconButton, Snackbar, Toolbar, Tooltip } from '@mui/material';
import { QuestionMark, Refresh } from '@mui/icons-material';

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
let allImages: Image[] = [];
let needUpdateRegistry = !localStorage.hasOwnProperty(REGISTRY);

export const copyToClipboard = (value: string, showValue = true) => {
  navigator.clipboard.writeText(value);
  ddClient?.desktopUI?.toast?.success(showValue ? `${value} copied to clipboard` : "Copied to clipboard");
};

export const openExternal = (value: string) => {
  ddClient?.host?.openExternal(value);
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
  const [imagesState, setImagesState] = React.useState<ImageState>({});
  const [loading, setLoading] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [latest, setLatest] = React.useState('');
  const [updateRegistry, setUpdateRegistry] =
    React.useState(needUpdateRegistry);

  const setImageState = (fullName: string, state: string) => {
    setImagesState((prevState: ImageState) => ({
      ...prevState,
      [fullName]: state,
    }));
  };

  React.useEffect(() => {
    const iris = images.find((el) => el.name === 'iris-community');
    if (iris) {
      const latest = `${iris.repository}/${iris.name}:${iris.tags[0]}`;
      setLatest(latest);
    }
  }, [images]);

  React.useEffect(() => {
    loadDockerImages().then((list) => {
      list.forEach((el) => {
        setImageState(el, 'idle');
      });
    });
  }, [images, value]);

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
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const pullImage = (image: string, tag: string) => {
    const fullName = `${image}:${tag}`;
    setImageState(fullName, 'pull');

    const progress: { [key: string]: string } = {};
    const statusCost: { [key: string]: number } = {
      'Pulling fs layer': 1,
      Waiting: 2,
      'Verifying Checksum': 3,
      'Download complete': 4,
      'Already exists': 5,
      'Pull complete': 5,
    };
    const countProgress = () => {
      const all = Object.entries(progress).length * 5;
      const curr = Object.values(progress)
        .map((status) => statusCost[status] || 0)
        .reduce((a, b) => a + b, 0);
      return Math.ceil((curr / all) * 100);
    };

    ddClient?.docker.cli.exec('pull', [fullName], {
      stream: {
        onOutput(data) {
          const line = data.stdout || '';
          if (line.indexOf(':') === 12) {
            const [hash, status] = line.split(': ');
            progress[hash] = status;
            setImageState(fullName, 'pull:' + countProgress());
          }
        },
        onError(error) {
          console.error(error);
        },
        onClose(exitCode) {
          ddClient.desktopUI.toast.success(`Docker image ${fullName} pulled`);
          setImageState(fullName, 'idle');
        },
        splitOutputLines: true,
      },
    });
  };

  const rmImage = (image: string, tag: string) => {
    const fullName = `${image}:${tag}`;
    setImageState(fullName, 'rm');
    ddClient?.docker.cli.exec('rmi', [fullName], {
      stream: {
        onOutput(data) {},
        onError(error) {
          console.error(error);
        },
        onClose(exitCode) {
          ddClient.desktopUI.toast.success(`Docker image ${fullName} deleted`);
          setImageState(fullName, 'nope');
        },
        splitOutputLines: true,
      },
    });
  };

  return (
    <>
      <AppBar position="fixed" color="transparent">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <img
              alt="InterSystems"
              src="intersystems-logo.svg"
              height={'50px'}
            />
          </Typography>
          <Tooltip title="Refresh from registry">
            <IconButton
              size="large"
              aria-label="refresh"
              color="inherit"
              onClick={() => setUpdateRegistry(true)}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Show help">
            <IconButton
              size="large"
              aria-label="help"
              color="inherit"
              onClick={() => setShowHelp(true)}
            >
              <QuestionMark />
            </IconButton>
          </Tooltip>
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
            imagesState={imagesState}
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
            imagesState={imagesState}
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
              imagesState={imagesState}
              kind={'tools'}
              root="iscinternal"
              onPull={pullImage}
              onDelete={rmImage}
              onCopy={copyToClipboard}
            />
          </TabPanel>
        )}
      </Box>
      <Help open={showHelp} onClose={() => setShowHelp(false)} latest={latest} />
    </>
  );
}
