import { useState, useRef, useEffect } from 'react';
import './WorkTypeMenu.css';

const WorkTypeMenu = ({ workBreakdown, onViewDetails }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleViewDetails = () => {
        setIsOpen(false);
        onViewDetails(workBreakdown);
    };

    return (
        <div className="work-type-menu" ref={menuRef}>
            <button
                className="menu-trigger"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                title="More options"
            >
                ⋮
            </button>
            {isOpen && (
                <div className="menu-dropdown">
                    <button className="menu-item" onClick={handleViewDetails}>
                        📋 View Details
                    </button>
                </div>
            )}
        </div>
    );
};

export default WorkTypeMenu;
