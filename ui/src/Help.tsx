import Modal, { ModalProps } from '@mui/material/Modal';
import Link from '@mui/material/Link';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import helpLogin from './login.png';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { copyToClipboard } from './App';
import IconButton from '@mui/material/IconButton';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80vw',
  maxHeight: '80vh',
  overflow: 'auto',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const styleBlock = {
  marginBottom: '1em',
};

const styleParagraph = {
  marginBottom: '1em',
};

function CodeBlock(props: { code: string }) {
  const { code } = props;
  return (
    <Typography
      sx={{
        position: 'relative',
        paddingLeft: '1em',
        border: '1px solid gray',
        '&:hover button': {
          visibility: 'visible',
        },
      }}
      onClick={() => copyToClipboard(code, false)}
    >
      <pre>{code.trim()}</pre>
      <Tooltip
        title="Copy"
        sx={{
          visibility: 'hidden',
          position: 'absolute',
          right: '.5em',
          top: '.5em',
        }}
      >
        <IconButton>
          <ContentCopyOutlinedIcon />
        </IconButton>
      </Tooltip>
    </Typography>
  );
}

function CopyLink(props: { href: string }) {
  return (
    <Tooltip title="Copy">
      <Link
        style={{ cursor: 'pointer' }}
        onClick={() => copyToClipboard(props.href)}
      >
        {props.href}
      </Link>
    </Tooltip>
  );
}

const runExample = (latest: string) => String.raw`
docker run --name iris \
  --detach \
  --publish 1972:1972 \
  --publish 52773:52773 \
  ${
    latest ||
    'containers.intersystems.com/intersystems/iris-community:2022.1.0.209.0'
  }`;

export function Help(props: Omit<ModalProps, 'children'> & { latest: string }) {
  const { latest } = props;
  const modalProps = props;
  return (
    <Modal
      {...modalProps}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Box sx={styleBlock}>
          <Typography variant="h3">InterSystems IRIS</Typography>
          <Typography sx={styleParagraph}>
            InterSystems IRIS® makes it easier to build high-performance,
            machine learning-enabled applications that connect data and
            application silos.
          </Typography>
          <Typography sx={styleParagraph}>
            It provides high performance database management, interoperability,
            and analytics capabilities, all built-in from the ground up to speed
            and simplify your most demanding data-intensive applications, and
            integrates seamlessly into your existing infrastructure.
          </Typography>
        </Box>
        <Box sx={styleBlock}>
          <Typography variant="h3">Community images</Typography>
          <Typography sx={styleParagraph}>
            InterSystems IRIS Community Edition comes with a free license and a
            few limitations, and is ideal for evaluation and testing.
          </Typography>
        </Box>
        <Box sx={styleBlock}>
          <Typography variant="h3">Run IRIS containers</Typography>
          <Typography sx={styleParagraph}>
            To run a new container with IRIS Community Edition use this command:
          </Typography>
          <CodeBlock code={runExample(latest)} />
          <Typography sx={styleParagraph}>
            <ul>
              <li>
                1972 is a super port used for binary connections such as
                ODBC/JDBC
              </li>
              <li>
                52773 is a interna web server port used to access System
                Management Portal and connect to IRIS Based web applications
                including REST, WebSockets and so on
              </li>
            </ul>
          </Typography>
          <Typography sx={styleParagraph}>
            When it successfully started go to System Management Portal{' '}
            <CopyLink href="http://localhost:52773/csp/sys/UtilHome.csp" />. By
            default User Name:{' '}
            <code style={{cursor: 'pointer'}} onClick={() => copyToClipboard('_SYSTEM', false)}>_SYSTEM</code> and
            Password: <code style={{cursor: 'pointer'}} onClick={() => copyToClipboard('SYS', false)}>SYS</code>.
            With the first login it will offer to change password. For futher
            information on how to work with IRIS look at the documentation{' '}
            <CopyLink href="https://docs.intersystems.com/" />.
          </Typography>
        </Box>
        <div>
          <Typography variant="h3">
            How to get access to non-community images?
          </Typography>
          <Typography style={styleParagraph}>
            To get access to non-comminoty images, you have to log into the
            InteSystems Container Registry, take the following steps:
            <li>
              Load <CopyLink href="https://containers.intersystems.com/" /> in
              your browser and log in with your InterSystems/WRC(World Responce
              Center) credentials. If you do not have credentials, yet, you can
              register at{' '}
              <CopyLink href="https://evaluation.intersystems.com/" />,{' '}
              <i>
                but remember that you still have to bring your own license for
                non-community images of IRIS
              </i>
              .
            </li>
            <li>
              Retrieve your Docker login token, or the full login command.
            </li>
            <li>
              In your Docker interface (for example, your PowerShell window or
              Linux command line), authenticate to the ICR using the provided
              credentials. You can do this by copying and pasting the full
              docker login command displayed, for example:
              <br />
              <img
                alt={
                  'docker login -u="customer@example.com" -p="********************************************" containers.intersystems.com'
                }
                src={helpLogin}
                width="100%"
              />
            </li>
          </Typography>
        </div>
      </Box>
    </Modal>
  );
}
