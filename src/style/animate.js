import { css, keyframes } from "goober"

export const scaleOnHover = (props) => {
  let { scale = '.98', duration = '.25s' } = props || {}
  return `
    transition: ${duration} transform;

    &:hover {
      transform: scale(${scale});
    }
  `
}

const slideRightKeyframes = (from, to) => keyframes`
  0% {
    transform: translateX(${from});
  }
  100% {
    transform: translateX(${to});
  }
`

export const slideRight = (props) => {
  const { from = `0%`, to = `100%`, duration = `.25s` } = props || {}
  return `
    animation: ${slideRightKeyframes(from, to)} ${duration} linear both;
  `
}

const opacityKeyframes = (from, to) => keyframes`
  0% {
    opacity: ${from};
  }
  100% {
    opacity: ${to};
  }
`

export const opacity = (props) => {
  const { from = 0, to = 1, duration = `.25s` } = props || {}
  return `
    animation: ${opacityKeyframes(from, to)} ${duration} linear both;
  `
}

const bounceInKeyframes = keyframes`
  0% {
    transform: scale(0);
    animation-timing-function: ease-in;
    opacity: 0;
  }
  38% {
    transform: scale(1);
    animation-timing-function: ease-out;
    opacity: 1;
  }
  55% {
    transform: scale(0.7);
    animation-timing-function: ease-in;
  }
  72% {
    transform: scale(1);
    animation-timing-function: ease-out;
  }
  81% {
    transform: scale(0.84);
    animation-timing-function: ease-in;
  }
  89% {
    transform: scale(1);
    animation-timing-function: ease-out;
  }
  95% {
    transform: scale(0.95);
    animation-timing-function: ease-in;
  }
  100% {
    transform: scale(1);
    animation-timing-function: ease-out;
  }
`

export const bounceIn = (props) => {
  const { duration = `.25s` } = props || {}
  return `
    animation: ${bounceInKeyframes} ${duration} both;
  `
}