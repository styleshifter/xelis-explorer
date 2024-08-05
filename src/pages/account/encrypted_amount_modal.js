import Icon from 'g45-react/components/fontawesome_icon'
import { useMemo, useState } from 'react'
import { useLang } from 'g45-react/hooks/useLang'

import Modal from '../../components/modal'
import style from './style'

function SafeIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.9998 15.3714V17.5614C22.9998 20.0014 21.2198 22.3014 18.7998 22.9714C18.6298 23.0114 18.4498 23.0114 18.2898 22.9714C17.1098 22.6514 16.0698 21.9314 15.3398 21.0014C14.5498 20.0214 14.0898 18.8114 14.0898 17.5614V15.3714C14.0898 14.9514 14.3998 14.4914 14.7798 14.3314L17.5598 13.1914C18.1898 12.9414 18.8898 12.9414 19.5198 13.1914L20.5198 13.6014L22.3098 14.3314C22.6898 14.4914 22.9998 14.9514 22.9998 15.3714Z" />
    <path d="M20.9493 11.0113L20.7693 12.0813L20.0693 11.8013C19.0793 11.4013 17.9993 11.4013 16.9893 11.8013L14.1993 12.9513C13.2493 13.3513 12.5893 14.3413 12.5893 15.3713V17.5613C12.5893 18.7513 12.9193 19.9413 13.5293 21.0013H6.1793C4.8093 21.0013 3.5193 19.9113 3.2893 18.5613L2.0293 11.0113C1.8693 10.0813 2.3393 8.83126 3.0793 8.24126L9.6593 2.98126C10.6693 2.17126 12.3093 2.17126 13.3193 2.99126L19.8993 8.24126C20.6293 8.83126 21.1093 10.0813 20.9493 11.0113Z" />
  </svg>
}

function EncryptedAmountModal(props) {
  const { title, commitment } = props
  const [visible, setVisible] = useState()
  const { t } = useLang()

  const hexCommitment = useMemo(() => {
    return (commitment || []).map((bytes) => {
      return bytes.toString(16)
    })
  }, [commitment])

  return <>
    <button className={style.amountModal.button} onClick={() => setVisible(true)}>
      <Icon name="lock" />
      <div>{t(`Encrypted`)}</div>
    </button>
    <Modal visible={visible} setVisible={setVisible}>
      <div className={style.amountModal.container}>
        <div className={style.amountModal.value}>{t(`You need wallet access to view the available balance.`)}</div>
        <SafeIcon />
        <div>{t(`Hex commitment`)}</div>
        <div className={style.amountModal.hexCommitment}>
          {hexCommitment}
        </div>
      </div>
    </Modal>
  </>
}

export default EncryptedAmountModal