import "./TopBtn.css"
import { useState, useEffect } from "react";

export default function ScrollToTopButton() {
    const [isBtnVisible, setIsBtnVisible] = useState(false)

    const checkScrollTop = () => {
        if (!isBtnVisible && window.scrollY > 20) {
            setIsBtnVisible(true)
        } else if (isBtnVisible && window.scrollY <= 20) {
            setIsBtnVisible(false)
        }
    }

    useEffect(() => {
        window.addEventListener('scroll', checkScrollTop)

        return () => {
            window.removeEventListener('scroll', checkScrollTop)
        }   
     }, [isBtnVisible])

     const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
     }

     return (
        <>
            {isBtnVisible && (
                <button className="topBtn" onClick={scrollToTop}>Top</button>
            )}
        </>
     )
}